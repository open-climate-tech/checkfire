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

import getPreferences from '../modules/getPreferences.mjs'
import Duration from '../modules/Duration.mjs'
import mapAnglesToPixels from '../modules/mapAnglesToPixels.mjs'
import mapPixelsToAngles from '../modules/mapPixelsToAngles.mjs'
import query from '../modules/query.mjs'

import AuthnControl from './AuthnControl.jsx'
import PreferencesPanel from './PreferencesPanel.jsx'
import RegionMask from './RegionMask.jsx'
import RegionMaskControl from './RegionMaskControl.jsx'

const {error: report} = console

const Props = {
  // Begin with the map centered on Santa Barabara, CA. As soon as the API
  // returns a list of camera positions or a user-preferred region, reposition
  // the map to accommodate the new bounds.
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
    zoomControl: false
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
  const {isAuthenticated, onToggleAuthn} = props

  const [bounds, setBounds] = useState()
  const [link, setLink] = useState(getDefaultHref())
  const [message, setMessage] = useState('')
  const [prefs, setPrefs] = useState({})

  const {current: ref} = useRef({})

  const handleCancel = useCallback(() => {
    window.location.replace(getDefaultHref())
  }, [])

  const updateLink = useCallback((prefs) => {
    const [[south, west], [north, east]] = ref.bounds
    const latLong = [south, north, west, east].map((x) => x.toFixed(3)).join(',')
    const notify = !!prefs.shouldNotify
    const nextHref = `${getDefaultHref()}?latLong=${latLong}&notify=${notify}`

    setLink(nextHref)
  }, [ref])

  const handleSelectRegion = useCallback(() => {
    const {cameras, map} = ref
    ref.bounds = calculateBounds(map, cameras)
    setBounds(ref.bounds)
    map.fitBounds(ref.bounds, Props.SET_VIEW)
    updateLink(prefs)
  }, [prefs, ref, updateLink])

  const handleRegionUpdate = useCallback((westX, northY, eastX, southY) => {
    const {map} = ref
    const {lat: south, lng: west} = mapPixelsToAngles(map, westX, southY)
    const {lat: north, lng: east} = mapPixelsToAngles(map, eastX, northY)

    ref.bounds = [[south, west], [north, east]]
    ref.pixels = {westX, northY, eastX, southY}

    updateLink(prefs)
  }, [prefs, ref, updateLink])

  const handleSave = useCallback(() => {
    function call() {
      const [[south, west], [north, east]] = ref.bounds
      const region = {topLat: north, leftLong: west, bottomLat: south, rightLong: east}
      const webNotify = {webNotify: prefs.shouldNotify}

      const requests = [
        query.post('/api/setRegion', region),
        query.post('/api/setWebNotify', webNotify)
      ]

      return Promise.all(requests)
    }

    function callback() {
      handleCancel()
    }

    // TODO: Complete error handling. Allow some errors to go uncaught for now
    // as they will be logged to the Console.
    call().then(callback).catch((error) => {
      if (error.status === 401) {
        // Unauthorized. Ask the user to sign in.
        const fn = () => (call().finally(callback), onToggleAuthn(null, null, true))
        onToggleAuthn('Sign in to save preferences', fn)
      } else {
        setMessage('Oops… something went wrong, please try again')
        report(error)
      }
    })
  }, [handleCancel, onToggleAuthn, prefs.shouldNotify, ref])

  const handleUpdate = useCallback((data) => {
    const nextPrefs = {...prefs, ...data}
    setPrefs(nextPrefs)
    updateLink(nextPrefs)
  }, [prefs, updateLink])

  useEffect(() => {
    const {L} = window
    const map = initializeMap(ref)

    const promises = [query.get('/api/monitoredCameras'), getPreferences()]
    Promise.allSettled(promises).then(([cameras, prefs]) => {
      let nextBounds

      if (cameras.value != null) {
        const {data} = ref.cameras = cameras.value

        if (ref.points != null) {
          ref.points.forEach((x) => x.remove())
        }

        ref.points = data.map(({latitude: lat, longitude: lng}) => {
          return L.circleMarker([lat, lng], Props.CAMERA).addTo(map)
        })

        nextBounds = calculateBounds(map, data)
      }

      if (prefs.value != null) {
        setPrefs(prefs.value)

        if (prefs.value.region != null) {
          const {region: {east, north, south, west}} = prefs.value
          nextBounds = [[south, west], [north, east]]
        }
      }

      if (nextBounds == null) {
        if (prefs.reason != null) {
          prefs.reason.message = `Failed to determine preferred region: ${prefs.reason.message}`
          throw prefs.reason
        }

        if (cameras.reason != null) {
          cameras.reason.message = `Failed to determine default region: ${cameras.reason.message}`
          throw cameras.reason
        }
      }

      setBounds(nextBounds)
      setTimeout(() => map.fitBounds(nextBounds, Props.SET_VIEW), 250)
    })
  }, [ref])

  useEffect(() => {
    const {L} = window
    const map = initializeMap(ref)


    const handlers = {
      moveend: () => {
        // Stash the latest bounds after the user stops moving the map.
        const {westX = 0, northY = 0, eastX = 0, southY = 0} = ref.pixels || {}
        handleRegionUpdate(westX, northY, eastX, southY)
      },
      zoomend: () => {
        const {markers, points} = ref

        if (points != null && points.length > 0) {
          if (markers != null) {
            markers.forEach((x) => x.remove())
          }

          const radius = calculateRadius(map, points[0].getLatLng())

          ref.markers = points.map((x) => {
            const opacities = calculateRadiusOpacities(x, points)
            const props = {...Props.CAMERA_RADIUS, ...opacities, radius}
            const marker = L.circleMarker(x.getLatLng(), props).addTo(map)

            x.remove().addTo(map)

            return marker
          })
        }

        if (bounds != null) {
          if (ref.pixels == null) {
            // Initialize coordinates on first zoom triggered by `fitBounds()`.
            const [[south, west], [north, east]] = bounds
            const {x: eastX, y: northY} = mapAnglesToPixels(map, north, east)
            const {x: westX, y: southY} = mapAnglesToPixels(map, south, west)

            ref.bounds = [[south, west], [north, east]]
            ref.pixels = {westX, northY, eastX, southY}
          }

          // Stash the latest bounds after the map stops zooming.
          const {westX = 0, northY = 0, eastX = 0, southY = 0} = ref.pixels || {}
          handleRegionUpdate(westX, northY, eastX, southY)
        }
      }
    }

    map.on(handlers)
    return () => map.off(handlers)
  }, [bounds, handleRegionUpdate, ref])

  const panelProps = {
    isAuthenticated,
    link: link,
    map: ref.map,
    message: message,
    onCancel: handleCancel,
    onSave: handleSave,
    onToggleAuthn,
    onUpdate: handleUpdate,
    prefs: prefs
  }

  return 0,
  <div className="c7e-preferences">
    <div className="c7e-preferences--map" id="preferences-map"/>
    <PreferencesPanel {...panelProps}/>
    <AuthnControl
      container={ref.authnControlDiv} map={ref.map}
      isAuthenticated={isAuthenticated} onToggleAuthn={onToggleAuthn}/>
    <RegionMaskControl container={ref.zoomControlDiv} map={ref.map} onSelectRegion={handleSelectRegion}/>
    <RegionMask bounds={bounds} container={ref.regionMaskDiv} live={ref} map={ref.map} onResize={handleRegionUpdate}/>
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

function getDefaultHref() {
  const {href, pathname} = window.location
  const nextPathname = pathname.split('/').filter((x) => x !== 'preferences').join('/')
  const nextHref = href.replace(pathname, nextPathname)

  return nextHref
}

function getInifiniteBounds() {
  return [[Infinity, Infinity], [-Infinity, -Infinity]]
}

function initializeMap(ref) {
  if (ref.map == null) {
    const {L} = window
    const map = ref.map = L.map('preferences-map', Props.MAP).setView(Props.CENTER, 6)

    const regionMask = L.control({position: 'topleft'})
    const regionMaskDiv = document.createElement('div')
    regionMask.onAdd = () => (ref.regionMaskDiv = regionMaskDiv)
    regionMask.addTo(map)

    const authnControl = L.control({position: 'topright'})
    const authnControlDiv = document.createElement('div')
    authnControl.onAdd = () => (ref.authnControlDiv = authnControlDiv)
    authnControl.addTo(map)

    const zoomControl = L.control({position: 'bottomright'})
    const zoomControlDiv = document.createElement('div')
    zoomControl.onAdd = () => (ref.zoomControlDiv = zoomControlDiv)
    zoomControl.addTo(map)

    L.control.scale().addTo(map)
    L.tileLayer(Props.URL_TEMPLATE, Props.TILE_LAYER).addTo(map)
  }

  return ref.map
}
