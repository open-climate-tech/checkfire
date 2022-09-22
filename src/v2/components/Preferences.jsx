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

import React, {useEffect, useRef} from 'react'

import Duration from '../modules/Duration.mjs'
import query from '../modules/query.mjs'

const Props = {
  // Begin with the map centered Santa Barabara, CA. As soon as the API returns
  // a list of camera positions, reposition the map to accommodate the bounds
  // occupied by the cameras.
  CENTER: [34.3987, -119.8199],
  CAMERA: {
    color: '#c00',
    fill: '#c00',
    fillOpacity: 0.73,
    opacity: 0.93,
    radius: 3,
    weight: 1
  },
  CAMERA_RADIUS: {
    color: '#c00',
    fill: '#c00',
    fillOpacity: 0.07,
    opacity: 0.13,
    radius: 1.50,
    weight: 1.50
  },
  MAP: {
    zoomAnimationThreshold: 18,
    zoomControl: true
  },
  TILE_LAYER: {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  },
  SET_VIEW: {
    animate: true,
    duration: Duration.SECOND / 1000
  },
  URL_TEMPLATE: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
}

const DegreesOffet = {
  // 20 miles estimated coverage / 54.6 miles per degree of longitude.
  // 20 miles estimated coverage / 69 miles per degree of latitude.
  EAST: 20 / 54.6,
  NORTH: 20 / 69,
  SOUTH: -20 / 69,
  WEST: -20 / 54.6
}

/**
 * @returns {React.Element}
 */
export default function Preferences(props) {
  const stateRef = useRef({})

  useEffect(() => {
    const {L} = window
    const ref = initializeMap(stateRef.current)
    const {map} = ref

    query.get('/api/monitoredCameras').then(({data}) => {
      if (ref.points != null) {
        ref.points.forEach((x) => x.remove())
      }

      map.on({
        zoom: () => {
          const {markers, points} = ref

          if (points != null && points.length > 0) {
            if (markers != null) {
              markers.forEach((x) => x.remove())
            }

            const radius = calculateRadius(map, points[0].getLatLng())
            ref.markers = points.map((x) => {
              const opacities = calculateRadiusOpacities(x, points)
              const marker = L.circleMarker(x.getLatLng(), {...Props.CAMERA_RADIUS, ...opacities, radius}).addTo(map)
              x.remove().addTo(map)
              return marker
            })
          }
        }
      })

      ref.points = data.map(({latitude: lat, longitude: lng}) => L.circleMarker([lat, lng], Props.CAMERA).addTo(map))
      setTimeout(() => map.fitBounds(calculateBounds(map, data), Props.SET_VIEW), 250)
    })
    return () => map.off('zoom')
 }, [])

  return 0,
  <div className="c7e-preferences">
    <div className="c7e-preferences--map" id="preferences-map"/>
  </div>
}

// -----------------------------------------------------------------------------

function calculateBounds(map, cameras) {
  return cameras.reduce((bounds, {latitude: lat, longitude: lng}) => {
    const [[south, west], [north, east]] = bounds

    bounds[0][0] = Math.min(south, lat + DegreesOffet.SOUTH)
    bounds[0][1] = Math.min(west, lng + DegreesOffet.WEST)
    bounds[1][0] = Math.max(north, lat + DegreesOffet.NORTH)
    bounds[1][1] = Math.max(east, lng + DegreesOffet.EAST)

    return bounds
  }, getInifiniteBounds())
}

function calculateRadius(map, origin) {
  const {lat, lng} = origin
  const {L} = window
  const projection = L.CRS.EPSG3857
  const zoom = map.getZoom()

  const {x, y} = projection.latLngToPoint(L.latLng(lat, lng), zoom)
  const {east, north, south, west} =
    Object.entries(DegreesOffet).reduce((points, [direction, offset]) => {
      switch (direction) {
        case 'EAST':
          points.east = projection.latLngToPoint(L.latLng(lat, lng + offset), zoom)
          break
        case 'NORTH':
          points.north = projection.latLngToPoint(L.latLng(lat + offset, lng), zoom)
          break
        case 'SOUTH':
          points.south = projection.latLngToPoint(L.latLng(lat + offset, lng), zoom)
          break
        case 'WEST':
          points.west = projection.latLngToPoint(L.latLng(lat, lng + offset), zoom)
          break
        default:
          throw new Error(`Unexpected direction: ${direction}`)
      }

      return points
    }, {})

  const distance = Math.abs(east.x - x)
    + Math.abs(north.y - y)
    + Math.abs(south.y - y)
    + Math.abs(west.x - x)

  return Math.round(distance / 4)
}

const DEGREES_RADIUS_SQ =
  Math.pow((DegreesOffet.EAST + DegreesOffet.NORTH) / 2, 2)

function calculateRadiusOpacities(point, points) {
  const {lat, lng} = point.getLatLng()
  const {length: nNearbyPoints} = points.filter((x) => {
    const {lat: xlat, lng: xlng} = x.getLatLng()
    const deltaLatSq = Math.pow(xlat - lat, 2)
    const deltaLngSq = Math.pow(xlng - lng, 2)

    return deltaLatSq + deltaLngSq < DEGREES_RADIUS_SQ
  })

  const opacityRatio = Math.min(4 / nNearbyPoints, 1)
  const opacities = {
    fillOpacity: Props.CAMERA_RADIUS.fillOpacity * opacityRatio,
    opacity: Props.CAMERA_RADIUS.opacity * opacityRatio
  }

  return opacities
}

function getInifiniteBounds() {
  return [[Infinity, Infinity], [-Infinity, -Infinity]]
}

function initializeMap(ref) {
  if (ref.map == null) {
    const {L} = window
    ref.map = L.map('preferences-map', Props.MAP).setView(Props.CENTER, 6)
    L.control.scale().addTo(ref.map)
    L.tileLayer(Props.URL_TEMPLATE, Props.TILE_LAYER).addTo(ref.map)
  }

  return ref
}
