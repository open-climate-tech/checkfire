// -----------------------------------------------------------------------------
// Copyright 2022 Open Climate Tech Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// -----------------------------------------------------------------------------

import React, {useCallback, useEffect, useRef, useState} from 'react'

import Duration from '../modules/Duration.mjs'

import CameraMarker from './CameraMarker.jsx'
import DateTime from './DateTime.jsx'
import FireListMapControl from './FireListMapControl.jsx'
import MulticameraBadge from './MulticameraBadge.jsx'

import getCameraKey from '../modules/getCameraKey.mjs'
import findPrimaryPolygon from '../modules/findPrimaryPolygon.mjs'
import hasCameraKey from '../modules/hasCameraKey.mjs'

const Props = {
  BADGE_Z_INDEX_OFFSET: 500,
  BOUNDS: [[32.4, -122.1], [36.9, -115.8]], // Corners of `midsocalCams` region.
  CENTER: [34.69, 240.96], // Midpoint between corners of `BOUNDS`.
  DEFAULT_Z_INDEX_OFFSET: 0,
  INTERSECTING_POLYGON: {
    color: '#c00',
    fill: '#c00',
    fillOpacity: 0.15,
    opacity: 0.80,
    weight: 1.50
  },
  MAP: {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    zoomAnimationThreshold: 18,
    zoomControl: false
  },
  MARKER_Z_INDEX_OFFSET: 250,
  POLYGON: {
    color: '#00f',
    dashArray: '3',
    fill: '#00f',
    fillOpacity: 0.07,
    opacity: 0.33,
    weight: 1.50
  },
  PRIMARY_POLYGON: {
    color: '#f0f',
    dashArray: null,
    fill: '#f0f',
    fillOpacity: 0.15,
    opacity: 0.60,
    weight: 1.50
  },
  SET_VIEW: {
    animate: true,
    duration: Duration.SECOND / 1000
  },
  URL_TEMPLATE: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
}

// TODO: Implement prescribed fire markers.

/**
 * Provides an interactive map of detected fires.
 *
 * @param {Object} props
 * @param {Array} props.fires - The list of fires to plot on the map.
 * @param {Array} props.firesByKey - An index of all fires.
 * @param {function(number)} props.onScrollToFire - Event handler to be called
 *     when a fire at a specific index should scroll itself into view.
 * @param {number} props.selectedIndex - The index of the active fire.
 *
 * @returns {React.Element}
 */
export default function FireMap(props) {
  const {fires, firesByKey, onScrollToFire, selectedIndex} = props

  const [scrollingTo, setScrollingTo] = useState(-1)

  // NOTE: Use references extensively here because React and Leaflet use
  // different models for maintaining state and interacting with the DOM. For
  // example, we want to cache the map as well as map markers, polygons, and the
  // like rather than regenerating them on every React render cycle. In order to
  // register an event listener with cached markers, we need a stable callback
  // and list of fires (otherwise the cached markers will use stale instances of
  // these in the closure created by the React render cycle).
  const controlRef = useRef()
  const expandedStackRef = useRef(null)
  const fireRef = useRef()
  const firesRef = useRef()
  const mapRef = useRef()
  const markersRef = useRef({})
  const onScrollToFireRef = useRef()
  const stacksRef = useRef({})
  const timerRef = useRef()

  firesRef.current = fires
  onScrollToFireRef.current = onScrollToFire

  const handleCameraClick = useCallback((key) => {
    const {current: fires} = firesRef
    const {current: onScrollToFire} = onScrollToFireRef
    const index = fires.findIndex((x) => hasCameraKey(x, key))

    setScrollingTo(index)
    onScrollToFire(index)
  }, [])

  useEffect(() => {
    // Finished scrolling. Allow the map to update.
    if (selectedIndex === scrollingTo) {
      setScrollingTo(-1)
    }
  }, [scrollingTo, selectedIndex])

  useEffect(() => {
    // Generate map objects (markers, polygons, ...) once whenever the list of
    // fires changes as opposed to each time the user activates a given fire.

    // Start by clearing all cached markers...
    Object.keys(markersRef.current).forEach((key) => {
      const marker = markersRef.current[key]
      marker.icon.remove()
      marker.polygons.forEach((x) => x.remove())

      if (marker.intersection != null) {
        marker.intersection.remove()
      }
    })

    // ...and all cached stacks.
    Object.keys(stacksRef.current).forEach((key) => {
      const stack = stacksRef.current[key]
      if (stack.badge != null) {
        stack.badge.remove()
      }
    })

    const {L} = window
    const {current: map} = initializeMap(mapRef, controlRef)
    const markers = (markersRef.current = {})
    const stacks = (stacksRef.current = {})

    fires.forEach((fire) => {
      const key = getCameraKey(fire)

      if (markers[key] != null) {
        console.error(`Marker '${key}' already exists`)
        return
      }

      const {
        camInfo: {
          latitude, longitude
        }, fireHeading: bearing = -0, polygon, sourcePolygons = []
      } = fire

      if (sourcePolygons.length === 0) {
        sourcePolygons[0] = polygon
      }

      const coordinates = [latitude, longitude]
      const html = CameraMarker.render({bearing})
      const cameraMarker = L.divIcon({html, tooltipAnchor: [12, 0]})

      const greatPolygon = []
      const polygons = []

      // Generate polygons for each secondary angle on this fire.
      Object.keys(fire._anglesByKey).forEach((k) =>
        addPolygon(firesByKey[k], polygons, greatPolygon))

      // Generate a polygon for this fire’s primary angle.
      addPolygon(fire, polygons, greatPolygon)

      markers[key] = {
        bearing,
        greatPolygon: L.polygon(greatPolygon, Props.POLYGON),
        icon: L.marker(coordinates, {icon: cameraMarker}),
        latitude,
        longitude,
        polygons
      }

      markers[key].icon.bindTooltip(renderFireTooltip(fire))
      markers[key].icon.on({click: () => {
        handleCameraClick(key)
      }})

      markers[key].icon.addTo(map)

      if (fire.sourcePolygons.length > 1) {
        // NOTE: Points passed when creating a polygon shouldn’t have a last
        // point equal to the first one. It’s better to filter out such points.
        // https://leafletjs.com/reference.html#polygon
        const vertices = fire.polygon.slice(0, fire.polygon.length - 1)
        markers[key].intersection = L.polygon(vertices, Props.INTERSECTING_POLYGON)
      }
      if (fire.sourcePolygons.length > 1) {
        markers[key].intersection = L.polygon(fire.polygon, Props.INTERSECTING_POLYGON)
      }

      markers[key].icon.on({
        click() {
          handleCameraClick(key)
        },

        // Handle hover events when this marker’s stack is expanded (actually,
        // when any stack is expanded, but this marker will be hidden when any
        // other marker’s stack is expanded).

        mouseout(event) {
          if (expandedStackRef.current != null) {
            event.target.setZIndexOffset(Props.DEFAULT_Z_INDEX_OFFSET)
          }
        },
        mouseover(event) {
          if (expandedStackRef.current != null) {
            event.target.setZIndexOffset(Props.MARKER_Z_INDEX_OFFSET)
          }
        }
      })

      markers[key].icon.addTo(map)

      const coordinatesKey = getCoordinatesKey(coordinates)
      if (stacks[coordinatesKey] == null) {
        stacks[coordinatesKey] = {
          cameraName: fire.camInfo.cameraName,
          cityName: fire.camInfo.cityName,
          badge: null,
          keys: new Set(),
          timestamp: Number.POSITIVE_INFINITY
        }
      }

      const stack = stacks[coordinatesKey]

      stack.keys.add(key)

      // The existing badge will be orphaned. Unregister its event handler.
      if (stack.badge != null) {
        stack.badge.off('click')
      }

      // Render a new badge each time to reflect changing `keys.size`.
      stack.badge =
        L.marker(coordinates, {
          icon: L.divIcon({
            html: MulticameraBadge.render({count: stack.keys.size})
          }),
          zIndexOffset: Props.BADGE_Z_INDEX_OFFSET
        })

      stack.timestamp = Math.min(stack.timestamp, fire.timestamp)
      stack.tooltip = renderStackTooltip(stack)
      stack.badge.bindTooltip(stack.tooltip)
      stack.badge.on({
        click: () => toggleStack(map, markersRef, stacksRef, expandedStackRef, stack)
      })
    })
  }, [fires, firesByKey, handleCameraClick])

  useEffect(() => {
    // `selectedIndex` will change rapidly when fires are loading, once for each
    // fire loaded.
    const fire = fires[selectedIndex]

    if (fire != null && scrollingTo === -1) {
      const {current: map} = initializeMap(mapRef, controlRef)
      const {current: markers} = markersRef
      const {current: stacks} = stacksRef
      const {camInfo: {latitude, longitude}} = fire
      const key = getCameraKey(fire)

      if (expandedStackRef.current != null) {
        toggleStack(map, markersRef, stacksRef, expandedStackRef)
      }

      Object.values(markers).forEach((x) => {
        if (x !== markers[key]) {
          x.polygons.forEach((p) => p.remove())
          if (x.intersection != null ) {
            x.intersection.remove()
          }
        }
      })

      // XXX: Force icon to front.
      markers[key].icon.remove()
      markers[key].icon.addTo(map)

      Object.keys(fire._anglesByKey).forEach((k) => {
        if (markers[k] != null) {
          // XXX: Force icon to front.
          markers[k].icon.remove()
          markers[k].icon.addTo(map)
        }
      })

      Object.values(stacks).forEach(({badge, keys}) => {
        // XXX: Force badge to front when relevant.
        badge.remove()
        if (keys.size > 1) {
          badge.addTo(map)
        }
      })

      markers[key].polygons.forEach((p) => {
        p.addTo(map)

        // Search polygon `p` for coordinates at the same latitude and
        // longitude as the camera itself.
        const isPrimary = p.getLatLngs()[0].some(({lat, lng}) =>
          lat === latitude && lng === longitude)

        if (isPrimary) {
          p.setStyle(Props.PRIMARY_POLYGON)
          p.bringToFront()
        } else {
          p.setStyle(Props.POLYGON)
        }
      })

      if (markers[key].intersection != null) {
        markers[key].intersection.addTo(map)
      }

      // Only animate map if the selected fire has changed.
      if (fireRef.current !== fire) {
        fireRef.current = fire

        // Debounce map pan and zoom.
        clearTimeout(timerRef.current)

        // Zoom out to give the user some context.
        map.setZoom(8, Props.SET_VIEW)

        timerRef.current = setTimeout(() => {
          map.panTo([latitude, longitude], Props.SET_VIEW)

          timerRef.current = setTimeout(() => {
            timerRef.current = setTimeout(() => {
              map.fitBounds(markers[key].greatPolygon.getBounds(), Props.SET_VIEW)
            }, Duration.SECOND)
          }, Duration.SECOND / 4)
        }, Duration.SECOND / 4)
      }
    }
  }, [fires, scrollingTo, selectedIndex])

  return 0,
  <div className="c7e-fire-list--map" id="map">
    <FireListMapControl container={controlRef.current} map={mapRef.current}/>
  </div>
}

// -----------------------------------------------------------------------------

function addPolygon(fire, polygons, greatPolygon) {
  const {L} = window
  const p = findPrimaryPolygon(fire)

  // NOTE: Points passed when creating a polygon shouldn’t have a last
  // point equal to the first one. It’s better to filter out such points.
  // https://leafletjs.com/reference.html#polygon
  const vertices = p.slice(0, p.length - 1)

  greatPolygon.splice(greatPolygon.length, 0, ...vertices)

  polygons.push(L.polygon(vertices, Props.PRIMARY_POLYGON))
}

function collapseStack(map, markers, stacks, stack) {
  // Rebind stack’s tooltip when it’s collapsed.
  stack.badge.bindTooltip(stack.tooltip)

  Object.values(markers).forEach((marker) => {
    const {latitude, longitude} = marker
    marker.icon.setLatLng([latitude, longitude])
    marker.icon.addTo(map)
  })

  Object.values(stacks).forEach((x) => x.keys.size > 1 && x.badge.addTo(map))
}

function expandStack(map, markers, stacks, stack) {
  const {L} = window
  const projection = L.CRS.EPSG3857
  const zoom = map.getZoom()

  // Hide stack’s tooltip while it’s expanded.
  stack.badge.unbindTooltip()

  // Fan each marker out in a circle around the latitude-longitude origin.
  Object.keys(markers).forEach((key) => {
    const marker = markers[key]

    if (stack.keys.has(key)) {
      const {bearing, latitude, longitude} = marker
      const point = projection.latLngToPoint(L.latLng([latitude, longitude]), zoom)
      const x = point.x + 32 * Math.sin(bearing * Math.PI / 180)
      const y = point.y - 32 * Math.cos(bearing * Math.PI / 180)
      const coordinates = projection.pointToLatLng(L.point([x, y]), zoom)

      marker.icon.setLatLng(coordinates)
    } else {
      marker.icon.remove()
    }
  })

  Object.values(stacks).forEach((x) => x !== stack && x.badge.remove())
}

function getCoordinatesKey(coordinates) {
  return coordinates.join(',')
}

function initializeMap(mapRef, controlRef) {
  if (mapRef.current == null) {
    const {L} = window
    const control = L.control({position: 'topleft'})
    const controlDiv = document.createElement('div')

    mapRef.current = L.map('map', Props.MAP).setView(Props.CENTER, 8)
    mapRef.current.fitBounds(Props.BOUNDS, Props.SET_VIEW)

    control.onAdd = () => (controlRef.current = controlDiv)
    control.addTo(mapRef.current)

    L.tileLayer(Props.URL_TEMPLATE).addTo(mapRef.current)
  }

  return mapRef
}

function renderFireTooltip(fire) {
  const {camInfo: {cameraName, cityName}, timestamp} = fire
  const date = new Date(timestamp * 1000)

  return `\
<div class="c7e-fire--location">
  <strong class="c7e-fire--city-name">${cityName}</strong> · ${cameraName}<br/>
  <time datetime="${date.toISOString()}" class="c7e-fire--date-time">${DateTime.render({date})}</time>
</div>`
}

function renderStackTooltip(stack) {
  const {cameraName, cityName, keys: {size}, timestamp} = stack
  const date = new Date(timestamp * 1000)

  return `\
<div class="c7e-fire--location">
  <strong class="c7e-fire--city-name">${cityName}</strong> · ${cameraName}<br/>
  <span>${size} ${size !== 1 ? 'fires' : 'fire'} detected since \
    <time datetime="${date.toISOString()}" class="c7e-fire--date-time">${DateTime.render({date})}</time>
  </span>
</div>`
}

function toggleStack(map, markersRef, stacksRef, expandedStackRef, stack) {
  const {current: markers} = markersRef
  const {current: stacks} = stacksRef

  if (expandedStackRef.current != null) {
    collapseStack(map, markers, stacks, expandedStackRef.current)
    expandedStackRef.current = null
    map.off('click')
  } else {
    expandStack(map, markers, stacks, stack)
    expandedStackRef.current = stack
    map.on({click: () => toggleStack(map, markersRef, stacksRef, expandedStackRef)})
  }
}
