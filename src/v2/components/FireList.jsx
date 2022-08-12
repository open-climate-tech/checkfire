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

import FireListContent from './FireListContent.jsx'
import FireListControl from './FireListControl.jsx'

import debounce from '../modules/debounce.mjs'
import query from '../modules/query.mjs'

/**
 * Receives a list of `fires` from a higher-order component and is responsible
 * for coordinating toolbar, map, and list content around scrolling and
 * fire-selection events.
 *
 * @param {Object} props
 * @param {Array} props.fires - A list of fires to be shown to the user.
 * @param {Array} props.firesByKey - An index of all known fires.
 * @param {number} props.indexOfOldFires - The index in `props.fires` where old
 *     fires begin (-1 if `props.fires` doesn’t currently contain older fires).
 * @param {number} props.nOldFires - The total number of old fires, regardless
 *     of whether they are currently displayed or not.
 * @param {function()} props.onToggleAllFires - Callback to hide/show old fires.
 * @param {function()} props.updateFires - Callback to trigger (re)render.
 *
 * @returns {React.Element}
 */
export default function FireList(props) {
  const {
    fires, firesByKey, indexOfOldFires, nOldFires, onToggleAllFires, updateFires
  } = props

  // The top position at which DOM elements become either visible or occluded
  // by the voting and pagination toolbar while scrolling.
  const [scrollTopThreshold, setscrollTopThreshold] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollBottomThreshold, setscrollBottomThreshold] = useState(0)

  // The index in the `fires` list that should be scrolled into view.
  const [scrollToIndex, setScrollToIndex] = useState(-1)

  // The index of the active fire in the `fires` list; used by toolbar and map
  // controls to provide correct context and behavior for the selected fire.
  const [selectedIndex, setSelectedIndex] = useState(0)

  const containerRef = useRef()
  const toolbarRef = useRef()

  const nFires = fires.length

  /**
   * To be called when an implicit action (e.g., user scrolling) should
   * activate the fire at `index` in the current `fires` list. Compare this to
   * `handleScrollToFire()`, which manages explicit fire activation and which
   * cues the beginning of scrolling to the fire at `index`.
   *
   * @param {number} index - The position of a `fire` in the `fires` list.
   *
   */
  const handleSelectFire = useCallback((index) => {
    if (index > -1 && index < nFires && index !== selectedIndex) {
      setSelectedIndex(index)
      setScrollToIndex(-1)
    }
  }, [nFires, selectedIndex])

  /**
   * Cues a lower-order component to initiate scrolling to the fire at `index`
   * in the current `fires` list. The component responsible for scrolling should
   * call `handleSelectFire()` when scrolling is complete.
   *
   * @param {number} index - The position of a `fire` in the `fires` list.
   */
  const handleScrollToFire = useCallback((index) => {
    if (index > -1 && index < nFires && index !== selectedIndex) {
      setScrollToIndex(index)
    }
  }, [nFires, selectedIndex])

  const handleVoteForFire = useCallback((index, vote) => {
    if (index > -1 && index < nFires) {
      const fire = fires[index]
      const promises = [fire]
        .concat(Object.keys(fire._anglesByKey).map((k) => firesByKey[k]))
        .reduce((a, f) => {
          const {cameraID, sortId, timestamp} = f

          // Vote only for `fire` and overlapping angles older than `fire`.
          if (sortId > fire.sortId) {
            return a
          }

          const hasVote = f.voted != null
          const isUndo = vote === 'undo'

          // Don’t try to undo nonexistant votes.
          if (isUndo && !hasVote) {
            return a
          }

          const isRealFire = vote === 'yes'
          const endpoint = isUndo ? '/api/undoVoteFire' : '/api/voteFire'

          const p =
            query.post(endpoint, {cameraID, isRealFire, timestamp}).then(() => {
              if (isUndo) {
                delete f.voted
              } else {
                f.voted = isRealFire
              }
            })

          a.push(p)
          return a
        }, [])

      // TODO: Implement error handling. Allow errors to go uncaught for now as
      // they will be logged to the Console.
      Promise.all(promises).then(() => updateFires(indexOfOldFires > -1))
    }
  }, [fires, nFires, indexOfOldFires, updateFires])

  useEffect(() => {
    // Ensure that `selectedIndex` is within the current array’s bounds. If it’s
    // not, scroll to the closest fire (assuming there is one).
    if (selectedIndex >= fires.length) {
      if (fires.length > 0) {
        handleScrollToFire(fires.length - 1)
      } else {
        setSelectedIndex(0)
        setScrollToIndex(-1)
      }
    }
  }, [fires, handleScrollToFire, selectedIndex])

  useEffect(() => {
    if (toolbarRef.current) {
      const threshold = toolbarRef.current.getBoundingClientRect().bottom
      setscrollTopThreshold(threshold)
    }

    const handleScroll = debounce(() => {
      const {documentElement: {scrollTop}} = document
      setScrollTop(scrollTop)
    })

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      const {bottom} = containerRef.current.getBoundingClientRect()
      setscrollBottomThreshold(bottom)
    }

    const handleResize = debounce(() => {
      const {bottom} = containerRef.current.getBoundingClientRect()
      setscrollBottomThreshold(bottom)
    })

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const Props = {
    FIRE_LIST_CONTENT: {
      fires,
      indexOfOldFires,
      nOldFires,
      onSelectFire: handleSelectFire,
      onToggleAllFires,
      scrollBottomThreshold,
      scrollTopThreshold,
      scrollToIndex,
      scrollTop,
      selectedIndex
    },
    FIRE_LIST_CONTROL: {
      fires,
      firesByKey,
      indexOfOldFires,
      onScrollToFire: handleScrollToFire,
      onSelectFire: handleSelectFire,
      onVoteForFire: handleVoteForFire,
      selectedIndex,
      toolbarRef
    }
  }

  return 0,
  <div ref={containerRef} className="c7e-fire-list">
    <FireListContent {...Props.FIRE_LIST_CONTENT}/>
    <FireListControl {...Props.FIRE_LIST_CONTROL}/>
  </div>
}
