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

import React, {useEffect, useRef, useState} from 'react'

import DateTime from './DateTime.jsx'
import DateTimeDistance from './DateTimeDistance.jsx'
import IconButton from './IconButton.jsx'

import concatClassNames from '../modules/concatClassNames.mjs'

/**
 * Provides the timelapse video preview and metadata for a detected fire.
 *
 * @param {Object} props
 * @param {Object} props.fire - A keyed collection of detected fire data.
 * @param {number} props.index - The position of this fire within a list of
 *     detected fires.
 * @param {function(number)} props.onSelectFire - Event handler to be called
 *     when this fire scrolls itself to a position where the next or previous
 *     fire should be activated.
 * @param {number} props.scrollBottomThreshold - The bottom pixel coordinate of
 *     the viewport that the fire list scrolls within.
 * @param {number} props.scrollTopThreshold - The bottom pixel coordinate of the
 *     top-most element (the toolbar) that the fire list scrolls under.
 * @param {number} props.scrollToIndex - The index of the fire that should be
 *     activated; if it matches `props.index`, scroll into view, then call
 *     `props.onSelectFire()`.
 * @param {number} props.scrollTop - The number of pixels that the window
 *     content is scrolled vertically.
 * @param {number} props.selectedIndex - The index of the active fire; if it
 *     matches `props.index`, then this fire is active.
 *
 * @returns {React.Element}
 */
export default function Fire(props) {
  const {
    fire: {
      annotatedUrl, croppedUrl, timestamp,
      camInfo: {
        cameraDir, cameraName, camerakUrl, cityName, network, networkUrl
      }
    },
    index, onSelectFire, scrollBottomThreshold, scrollToIndex, scrollTop,
    scrollTopThreshold, selectedIndex
  } = props

  const [scrollingTo, setScrollingTo] = useState(null)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)

  const containerRef = useRef()
  const isVideoLoadedRef = useRef(false)
  const timerRef = useRef()
  const videoRef = useRef()

  const selected = index === selectedIndex
  const classNames = concatClassNames('c7e-fire', selected && 'c7e-fire--selected')
  const date = new Date(timestamp * 1000)

  useEffect(() => {
    // Handle scrolling events while this fire is active as long as we’re not
    // scrolling to it or another fire automatically.
    if (selected && scrollToIndex < 0) {
      const {current: container} = containerRef
      const {bottom, height, top} = container.getBoundingClientRect()

      if (bottom - height / 4 <= scrollTopThreshold) {
        // When this fire scrolls off the top of the page (underneath and 3/4
        // occluded by the toolbar), pass control to the next fire.
        onSelectFire(index + 1)
      } else if (top + height / 4 >= scrollTopThreshold + height) {
        // When this fire scrolls more than 3/4 its own height from the top of
        // the page (i.e., from the toolbar), pass control to the previous fire.
        onSelectFire(index - 1)
      }
    }

    // Load video if we haven’t yet loaded it and the video is visible.
    if (!isVideoLoadedRef.current) {
      // XXX: The newest fires render at the top of the page, which means that
      // during initial page load as each fire is added in response to a
      // discrete `/fireEvents` event, it’s always “visible” even if subsequent
      // events push it below the fold before the user even perceives the page
      // load. So we wait for the next animation frame to avoid loading video
      // source for offscreen videos.
      cancelAnimationFrame(timerRef.current)
      timerRef.current = requestAnimationFrame(() => {
        const {current: container} = containerRef

        if (container != null) {
          const {height, top} = container.getBoundingClientRect()
          if (top + height / 4 < scrollBottomThreshold) {
            setShouldLoadVideo(isVideoLoadedRef.current = true)
          }
        }
      })
    }
  }, [
    index, onSelectFire, selected, scrollBottomThreshold, scrollToIndex,
    scrollTopThreshold, scrollTop, shouldLoadVideo
  ])

  useEffect(() => {
    // Scroll this fire into view when it is explicitly selected.
    if (index === scrollToIndex && scrollingTo === null) {
      const {current: container} = containerRef
      const top = Math.round(scrollTop + container.getBoundingClientRect().top
        - scrollTopThreshold)

      setScrollingTo(top)
      window.scrollTo({top, behavior: 'smooth'})
    }
  }, [index, scrollingTo, scrollTopThreshold, scrollToIndex, scrollTop])

  useEffect(() => {
    // Finish scrolling and activate this fire.
    if (Math.round(scrollTop) === scrollingTo) {
      setScrollingTo(null)
      onSelectFire(index)
    }
  }, [index, onSelectFire, scrollingTo, scrollTop])

  useEffect(() => {
    // Only play this fire’s timelapse video when it is active.
    const {current: video} = videoRef

    if (video != null) {
      if (selected === true) {
        video.currentTime = 0
        video.play().catch((error) => {
          // Ignore “play() request interrupted” errors.
          if (/play.*request.*interrupted/.test(error) === false) {
            throw error
          }
        })
      } else {
        video.pause()
      }
    }
  }, [selected])

  return 0,
  <div ref={containerRef} className={classNames} style={{position: 'relative'}}>
    <div className="cc7e-fire--video-container">
      <video className="c7e-fire--video" ref={videoRef} controls muted loop width="640" height="412">
        { shouldLoadVideo === true && <source src={croppedUrl} type="video/mp4"/> }
        Your browser does not support the video tag
      </video>
    </div>

    <div className="c7e-fire--caption">
      <p className="c7e-fire--location">
        <span className="c7e-dateline">
          <strong className="c7e-fire--city-name">{cityName}</strong>
          <span className="c7e-fire--date-time"> · <DateTimeDistance date={date}/> · <DateTime date={date}/></span>
        </span>
        <IconButton className="c7e-fire--full-image" icon="c7e-icon--full-image" title="Open full image" href={annotatedUrl} target="_blank" rel="noopener noreferrer"/>
      </p>
      <p className="c7e-fire--attribution">
        <a href={networkUrl} target="_blank" rel="noopener noreferrer">{network}</a>{' '}›{' '}
        <a href={camerakUrl} target="_blank" rel="noopener noreferrer">{cameraName}</a>
        { cameraDir &&
          <>{' '}›{' '}<span>Facing {cameraDir.toLowerCase()}</span></>
        }
      </p>
    </div>
  </div>
}
