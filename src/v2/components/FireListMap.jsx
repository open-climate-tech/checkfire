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

import getCameraKey from '../modules/getCameraKey.mjs'
import findPrimaryPolygon from '../modules/findPrimaryPolygon.mjs'
import hasCameraKey from '../modules/hasCameraKey.mjs'

const Props = {
  BOUNDS: [[32.4, -122.1], [36.9, -115.8]], // Corners of `midsocalCams` region.
  CENTER: [34.69, 240.96], // Midpoint between corners of `BOUNDS`.
  MAP: {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    zoomAnimationThreshold: 18
  },
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
  const firesRef = useRef()
  const mapRef = useRef()
  const markersRef = useRef({})
  const onScrollToFireRef = useRef()
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

    // Start by clearing all cached markers.
    Object.keys(markersRef.current).forEach((key) => {
      const marker = markersRef.current[key]
      marker.icon.remove()
      marker.polygons.forEach((x) => x.remove())
    })

    const {L} = window
    const {current: map} = initializeMap(mapRef, timerRef)
    const markers = (markersRef.current = {})

    fires.forEach((x) => {
      const key = getCameraKey(x)

      if (markers[key] != null) {
        console.error(`Marker '${key}' already exists`)
        return
      }

      const {
        camInfo: {
          latitude, longitude
        }, fireHeading: bearing, polygon, sourcePolygons = []
      } = x

      if (sourcePolygons.length === 0) {
        sourcePolygons[0] = polygon
      }

      const coordinates = [latitude, longitude]
      const html = CameraMarker.render({bearing})
      const cameraMarker = L.divIcon({html})

      const greatPolygon = []
      const polygons = []

      // Generate polygons for each secondary angle on this fire.
      Object.keys(x._anglesByKey).forEach((k) =>
        addPolygon(firesByKey[k], polygons, greatPolygon))

      // Generate a polygon for this fire’s primary angle.
      addPolygon(x, polygons, greatPolygon)

      markers[key] = {
        coordinates,
        key,
        greatPolygon: L.polygon(greatPolygon, Props.POLYGON),
        icon: L.marker(coordinates, {icon: cameraMarker}),
        polygons
      }

      markers[key].icon.on({click: () => {
        handleCameraClick(key)
      }})

      markers[key].icon.addTo(map)
    })
  }, [fires, firesByKey, handleCameraClick])

  useEffect(() => {
    // `selectedIndex` will change rapidly when fires are loading, once for each
    // fire loaded.
    const fire = fires[selectedIndex]

    if (fire != null && scrollingTo === -1) {
      const {current: map} = initializeMap(mapRef, timerRef)
      const {current: markers} = markersRef
      const {camInfo: {latitude, longitude}} = fire
      const coordinates = [latitude, longitude]
      const key = getCameraKey(fire)

      // Debounce map pan and zoom.
      clearTimeout(timerRef.current)

      if (markers[key] != null) {
        // Zoom out to give the user some context.
        map.setZoom(8, Props.SET_VIEW)

        timerRef.current = setTimeout(() => {
          Object.values(markers).forEach((x) => {
            if (x !== markers[key]) {
              x.polygons.forEach((p) => p.remove())
            }
          })

          map.panTo(coordinates, Props.SET_VIEW)

          timerRef.current = setTimeout(() => {
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

            markers[key].polygons.forEach((p) => {
              // Search polygon `p` for coordinates at the same latitude and
              // longitude as the camera itself.
              const isPrimary = p.getLatLngs()[0].some(({lat, lng}) =>
                lat === coordinates[0] && lng === coordinates[1])

              if (isPrimary) {
                p.setStyle(Props.PRIMARY_POLYGON)
                p.bringToFront()
              } else {
                p.setStyle(Props.POLYGON)
              }

              p.addTo(map)
            })

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

function initializeMap(mapRef, timerRef) {
  if (mapRef.current == null) {
    const {L} = window

    mapRef.current = L.map('map').setView(Props.CENTER, 8)
    mapRef.current.fitBounds(Props.BOUNDS, Props.SET_VIEW)

    L.tileLayer(Props.URL_TEMPLATE, Props.MAP).addTo(mapRef.current)
  }

  return mapRef
}
