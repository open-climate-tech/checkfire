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

import calculateBearing from '../modules/calculateBearing.mjs'
import calculateMidpoint from '../modules/calculateMidpoint.mjs'
import render from '../modules/render.mjs'

const Props = {
  MAP: {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    zoomAnimationThreshold: 18
  },
  POLYGON: {
    color: '#f0f',
    fill: '#f0f',
    fillOpacity: 0.15,
    opacity: 0.60,
    weight: 1.5
  },
  SET_VIEW: {
    animate: true,
    duration: Duration.SECOND / 1000
  },
  URL_TEMPLATE: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
}

/**
 * Provides an interactive map of detected fires.
 *
 * @param {Object} props
 * @param {Array} fires - The list of fires to plot on the map.
 * @param {boolean} loading - Whether the list of fires is still paging in.
 * @param {function(number)} onScrollToFire - Event handler to be called when
 *     when a fire at a specific index should scroll itself into view.
 * @param {number} props.selectedIndex - The index of the active fire.
 *
 * @returns {React.Element}
 */
export default function FireMap(props) {
  const {fires, loading, onScrollToFire, selectedIndex} = props

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
  const timersRef = useRef([])

  firesRef.current = fires
  onScrollToFireRef.current = onScrollToFire

  // `selectedIndex` will change rapidly when fires are loading, once for each
  // fire loaded.
  const fire = fires[selectedIndex]
  const latitude = fire != null ? fire.camInfo.latitude : null
  const longitude = fire != null ? fire.camInfo.longitude : null
  const cameraId = fire != null ? fire.cameraID : null
  const timestamp = fire != null ? fire.timestamp : null

  const handleCameraClick = useCallback((cameraId, timestamp) => {
    const {current: fires} = firesRef
    const {current: onScrollToFire} = onScrollToFireRef
    const index = fires.findIndex((x) => x.cameraID === cameraId && x.timestamp === timestamp)

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
    if (latitude != null && longitude != null && scrollingTo === -1) {
      const coordinates = [latitude, longitude]
      const key = `${cameraId}: ${latitude}, ${longitude} (${timestamp})`

      const {L} = window
      const {current: markers} = markersRef
      const {current: map} = initializeMap(L, mapRef, coordinates)

      // Generate map objects (markers, polygons, ...) once as opposed to each
      // time the user activates a fire in the list.
      if (markers[key] == null) {
        // Assume `polygon` is triangular with a base between the 2nd and 3rd vertices.
        const midpoint = calculateMidpoint(fire.polygon[1], fire.polygon[2])
        const bearing = calculateBearing(coordinates, midpoint)

        ;(async function () {
          const html = await render(<CameraMarker bearing={bearing}/>)
          const cameraMarker = L.divIcon({html})
          const cameraPolygon = L.polygon(fire.polygon.slice(), Props.POLYGON)

          markers[key] = {
            cameraId,
            icon: L.marker(coordinates, {icon: cameraMarker}),
            polygon: cameraPolygon,
            timestamp
          }

          markers[key].icon.on({click: () => {
            handleCameraClick(markers[key].cameraId, markers[key].timestamp)
          }})

          markers[key].icon.addTo(map)
        })()
      }

      if (loading === false) {
        // Debounce map pan and zoom.
        const {current: timers} = timersRef
        timers.forEach((x) => clearTimeout(x))

        if (markers[key] != null) {
          // Zoom out to give the user some context.
          map.setZoom(8, Props.SET_VIEW)

          timers[0] = setTimeout(() => {
            Object.values(markers).forEach((x) => x !== markers[key] && x.polygon.remove())
            map.panTo(coordinates, Props.SET_VIEW)

            timers[1] = setTimeout(() => {
              // XXX: Force icon to front.
              markers[key].icon.remove()
              markers[key].icon.addTo(map)

              markers[key].polygon.addTo(map)

              timers[2] = setTimeout(() => {
                map.fitBounds(markers[key].polygon.getBounds(), Props.SET_VIEW)
              }, Duration.SECOND / 1)
            }, Duration.SECOND / 4)
          }, Duration.SECOND / 4)
        }
      }
    }
  }, [
    cameraId, handleCameraClick, latitude, loading, longitude,
    scrollingTo, timestamp
  ])

  return 0,
  <div className="c7e-fire-list--map" id="map">
  </div>
}

// -----------------------------------------------------------------------------

function initializeMap(L, mapRef, coordinates) {
  if (mapRef.current == null) {
    mapRef.current = L.map('map').setView(coordinates, 11)
    L.tileLayer(Props.URL_TEMPLATE, Props.MAP).addTo(mapRef.current)
  }

  return mapRef
}
