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

import React, {useCallback, useEffect, useMemo, useRef} from 'react'
import ReactDOM from 'react-dom'

import debounce from '../modules/debounce.mjs'
import mapAnglesToPixels from '../modules/mapAnglesToPixels.mjs'

/**
 * Provides an interactive region mask with draggable handles that allows the
 * user to specify the map area they wish to monitor.
 *
 * @param {Object} props
 * @param {[[string, string], [string, string]]} props.bounds - The static
 *     south, west, north, and east bondaries of the user’s preferred monitoring
 *     region as determined by reading preferences.
 * @param {HTMLElement} props.container - The map control element into which the
 *     region mask should be rendered.
 * @param {Array} props.live - A ref containing dynamic data updated outside of
 *     the React render cycle.
 * @param {[[string, string], [string, string]]} props.live.bounds - The dynamic
 *     south, west, north, and east bondaries of the user’s preferred monitoring
 *     region as determined by their interactions with the map and region mask.
 * @param {Object} props.map - A Leaflet map instance.
 * @param {function(number, number, number, number)} props.onResize - The
 *     callback function to invoke with pixel coordinates for east, north,
 *     south, and west boundaries when the region mask is resized.
 *
 * @returns {React.Portal}
 */
export default function RegionMask(props) {
  const {bounds, container = null, live, map, onResize} = props

  const xRef = useRef({initialized: false})

  const updateNorth = useCallback(() => {
    const {clientY, panels} = xRef.current

    if (clientY != null) {
      const bottom = `${window.innerHeight - clientY}px`
      const top = `${clientY}px`

      panels.north.style.bottom = bottom
      panels.northeast.style.bottom = bottom
      panels.east.style.top = top
      panels.west.style.top = top
      panels.northwest.style.bottom = bottom
    }
  }, [])

  const updateEast = useCallback(() => {
    const {clientX, panels} = xRef.current

    if (clientX != null) {
      const left = `${clientX}px`
      const right = `${window.innerWidth - clientX}px`

      panels.north.style.right = right
      panels.northeast.style.left = left
      panels.east.style.left = left
      panels.southeast.style.left = left
      panels.south.style.right = right
    }
  }, [])

  const updateSouth = useCallback(() => {
    const {clientY, panels} = xRef.current

    if (clientY != null) {
      const bottom = `${window.innerHeight - clientY}px`
      const top = `${clientY}px`

      panels.east.style.bottom = bottom
      panels.southeast.style.top = top
      panels.south.style.top = top
      panels.southwest.style.top = top
      panels.west.style.bottom = bottom
    }
  }, [])

  const updateWest = useCallback(() => {
    const {clientX, panels} = xRef.current

    if (clientX != null) {
      const left = `${clientX}px`
      const right = `${window.innerWidth - clientX}px`

      panels.north.style.left = left
      panels.south.style.left = left
      panels.southwest.style.right = right
      panels.west.style.right = right
      panels.northwest.style.right = right
    }
  }, [])

  const handleDrag = useMemo(() => {
    return debounce((event) => {
      event.stopPropagation()
      const {clientX, clientY, target: {dataset: {handle}}} = event
      const {current: ref} = xRef

      switch (handle) {
        case 'north':
          updateNorth()
          break
        case 'northeast':
          updateNorth()
          updateEast()
          break
        case 'east':
          updateEast()
          break
        case 'southeast':
          updateSouth()
          updateEast()
          break
        case 'south':
          updateSouth()
          break
        case 'southwest':
          updateSouth()
          updateWest()
          break
        case 'west':
          updateWest()
          break
        case 'northwest':
          updateNorth()
          updateWest()
          break
        default: break
      }

      // `clientX` and `clientY` jump immediately before the drag ends so we’re
      // going to look for the previous event’s values and use those instead.
      // Stash this event’s `clientX` and `clientY`. As long as the drag event
      // fires again, we will use these values in the next callback. Otherwise,
      // the last event’s values, which are not correct, will be ignored.
      ref.clientX = clientX
      ref.clientY = clientY

      const {right: westX} = ref.panels.west.getBoundingClientRect()
      const {bottom: northY} = ref.panels.north.getBoundingClientRect()
      const {left: eastX} = ref.panels.east.getBoundingClientRect()
      const {top: southY} = ref.panels.south.getBoundingClientRect()

      onResize(westX, northY, eastX, southY)
    })
  }, [onResize, updateEast, updateNorth, updateSouth, updateWest])

  const handleMouseEnter = useCallback((event) => {
    event.stopPropagation()
    map.dragging.disable()
  }, [map])

  const handleMouseLeave = useCallback((event) => {
    event.stopPropagation()
    map.dragging.enable()

    xRef.current.clientX = null
    xRef.current.clientY = null
  }, [map])

  useEffect(() => {
    if (container != null) {
      const div = container.firstChild
      xRef.current.panels = {
        north: div.getElementsByClassName('c7e-region-mask--north')[0],
        northeast: div.getElementsByClassName('c7e-region-mask--northeast')[0],
        east: div.getElementsByClassName('c7e-region-mask--east')[0],
        southeast: div.getElementsByClassName('c7e-region-mask--southeast')[0],
        south: div.getElementsByClassName('c7e-region-mask--south')[0],
        southwest: div.getElementsByClassName('c7e-region-mask--southwest')[0],
        west: div.getElementsByClassName('c7e-region-mask--west')[0],
        northwest: div.getElementsByClassName('c7e-region-mask--northwest')[0]
      }
    }
  }, [container])

  useEffect(() => {
    const {current: ref} = xRef

    if (bounds != null && map != null) {
      function update() {
        const [[south, west], [north, east]] =
          (live != null && live.bounds != null) ? live.bounds : bounds

        const {x: eastX, y: northY} = mapAnglesToPixels(map, north, east)
        const {x: westX, y: southY} = mapAnglesToPixels(map, south, west)

        ref.clientX = eastX
        updateEast()

        ref.clientY = northY
        updateNorth()

        ref.clientY = southY
        updateSouth()

        ref.clientX = westX
        updateWest()

        ref.clientX = ref.clientY = null

        onResize(westX, northY, eastX, southY)
      }

      if (ref.initialized === false) {
        ref.initialized = true
        setTimeout(update, 1000)
      }

      const handlers = {resize: update}
      map.on(handlers)
      return () => map.off(handlers)
    }
  }, [
    bounds, live, map, onResize, updateEast, updateNorth, updateSouth, updateWest
  ])

  const handlers = {
    draggable: true,
    onDrag: handleDrag,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave
  }

  return container && ReactDOM.createPortal(
    <div className="c7e-region-mask">
      <div className="c7e-region-mask--north"><div data-handle="north" {...handlers}/></div>
      <div className="c7e-region-mask--northeast"><div data-handle="northeast" {...handlers}/></div>
      <div className="c7e-region-mask--east"><div data-handle="east" {...handlers}/></div>
      <div className="c7e-region-mask--southeast"><div data-handle="southeast" {...handlers}/></div>
      <div className="c7e-region-mask--south"><div data-handle="south" {...handlers}/></div>
      <div className="c7e-region-mask--southwest"><div data-handle="southwest" {...handlers}/></div>
      <div className="c7e-region-mask--west"><div data-handle="west" {...handlers}/></div>
      <div className="c7e-region-mask--northwest"><div data-handle="northwest" {...handlers}/></div>
    </div>, container)
}
