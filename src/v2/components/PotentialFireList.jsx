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

// TODO:
//   - Implement voting.
//   - Allow older fires to be viewed.
//   - Handle new incoming fires.
//   - Implement camera selection for multicamera fires.
//   - Implement user preferences.
//   - Implement user region.
//   - Implement search params.
//   - Implement notifications.
//   - Implement camera ID pinning.
//   - Implement adaptive/mobile version.

import React, {useCallback, useEffect, useRef, useState} from 'react'

import Duration from '../modules/Duration.mjs'

import getEventSource from '../modules/getEventSource.mjs'

import FireList from './FireList.jsx'

const TIMESTAMP_LIMIT = 1.25 * 365 * Duration.DAY // 2 * Duration.HOUR

/**
 * Responsible for querying the detected fire list, monitoring new fire events,
 * and transitioning between lists of new, extant, and old potential fires.
 */
export default function PotentialFireList() {
  const [isLoading, setIsLoading] = useState(true)

  // Fires newer than `TIMESTAMP_LIMIT` displayed to the user for review.
  const [fires, setFires] = useState([])
  const [firesBuffer, setFiresBuffer] = useState([])

  // Fires newer than `TIMESTAMP_LIMIT` not yet included in `fires`.
  // const [newFires, setNewFires] = useState([])

  // Fires older than `TIMESTAMP_LIMIT`.
  // const [oldFires, setOldFires] = useState([])

  const allFiresRef = useRef([])
  const eventSourceRef = useRef()
  const sseVersionRef = useRef()
  const nowRef = useRef()
  const timerRef = useRef()

  const handlePotentialFire = useCallback((event) => {
    const fire = JSON.parse(event.data)
    const {cameraID, croppedUrl, timestamp, version} = fire
    const {current: allFires} = allFiresRef

    if (!croppedUrl || croppedUrl.startsWith('c:/')) {
      return
    }

    if (sseVersionRef.current == null) {
      sseVersionRef.current = version
    }

    if (version !== sseVersionRef.current) {
      return window.location.reload()
    }

    const existingFire =
      allFires.find((x) => x.cameraID === cameraID && x.timestamp === timestamp)

    if (existingFire) {
      if (existingFire.croppedUrl !== croppedUrl) {
        // Fire is already indexed, but its video has been updated.
        existingFire.croppedUrl = croppedUrl
        console.error('Not implemented: updateFires()')
      }
    } else {
      allFires.unshift(fire)
      allFires.sort((a, b) => b.sortId - a.sortId)

      const now = Date.now()
      const timestampLimit = Math.round((now - TIMESTAMP_LIMIT) / 1000)

      if (nowRef.current === undefined) {
        nowRef.current = now
      }

      if (now - nowRef.current < 100) {
        // Multiple fires are streaming in from the server during initial load.
        nowRef.current = now
        setFiresBuffer(allFires.filter((x) => x.timestamp >= timestampLimit))
        // setOldFires(allFires.filter((x) => x.timestamp < timestampLimit))
      } else {
        // const mostRecentFire = fires[0]
        // const indexOfMostRecentFire = allFires.indexOf(mostRecentFire)
        //
        // setNewFires(allFires.slice(0, indexOfMostRecentFire))
        // setOldFires(allFires.slice(indexOfMostRecentFire + fires.length))
      }
    }
  }, [])

  useEffect(() => {
    if (isLoading && firesBuffer.length > 0) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (Date.now() - nowRef.current >= 150) {
          setFires(firesBuffer)
          setFiresBuffer([])
          setIsLoading(false)
        }
      }, 150)
    }
  }, [firesBuffer, isLoading])

  useEffect(() => {
    eventSourceRef.current = getEventSource('/fireEvents')

    const {current: eventSource} = eventSourceRef

    function tidy() {
      eventSource.removeEventListener('newPotentialFire', handlePotentialFire)
      eventSource.removeEventListener('closedConnection', tidy)
      eventSource.close() // Does nothing if the connection is already closed.
      eventSourceRef.current = null
    }

    eventSource.addEventListener('newPotentialFire', handlePotentialFire)
    eventSource.addEventListener('closedConnection', tidy)

    return tidy
  }, [handlePotentialFire])

  return <FireList fires={isLoading ? firesBuffer : fires} loading={isLoading}/>
}
