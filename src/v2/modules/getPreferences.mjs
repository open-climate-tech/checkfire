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

import parseRegion from '../modules/parseRegion.mjs'
import query from '../modules/query.mjs'

const {error: report} = console

const endpoint = '/api/getPreferences'

export default function getPreferences() {
  return query.get(endpoint)
    .then(({data}) => handleData(data))
    .catch((error) => {
      if (error.status !== 401) {
        throw error
      }

      return handleData()
    })
}

// -----------------------------------------------------------------------------

function handleData(data) {
  const searchParams = new URLSearchParams(window.location.search)
  const notifyParam = searchParams.get('notify')
  const regionParam = searchParams.get('latLong')
  const prefs = {region: null, shouldNotify: null}

  if (regionParam != null) {
    try {
      prefs.region = parseRegion(regionParam)
    } catch (error) {
      report(error)
    }
  }

  if (notifyParam != null) {
    if (/true|false/.test(notifyParam)) {
      prefs.shouldNotify = notifyParam === 'true'
    }
  }

  if (data != null && data.region != null) {
    if (prefs.region == null) {
      prefs.region = {
        north: data.region.topLat,
        south: data.region.bottomLat,
        west: data.region.leftLong,
        east: data.region.rightLong
      }
    }

    if (prefs.shouldNotify == null) {
      prefs.shouldNotify = data.webNotify
    }
  }

  if (prefs.region != null) {
    const isEmpty = prefs.region.north === 0 && prefs.region.south === 0 &&
      prefs.region.east === 0 && prefs.region.west === 0

    if (isEmpty) {
      prefs.region = null
    }
  }

  return prefs
}
