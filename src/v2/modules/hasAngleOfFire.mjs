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

import Duration from './Duration.mjs'

import arePolygonsEqual from './arePolygonsEqual.mjs'
import getCameraKey from './getCameraKey.mjs'

const TIMESTAMP_LIMIT_SECONDS = 15 * Duration.MINUTE / Duration.SECOND

let count = 0

export default function hasAngleOfFire(candidate, fire) {
  const key = getCameraKey(candidate)

  if (candidate._anglesByKey == null) {
    candidate._anglesByKey = {}
  }

  if (fire._anglesByKey == null) {
    fire._anglesByKey = {}
  }

  if (candidate !== fire && fire._anglesByKey[key] !== true) {
    if (candidate.sourcePolygons.length < fire.sourcePolygons.length) {
      if (candidate.timestamp <= fire.timestamp) {
        if (candidate.timestamp >= fire.timestamp - TIMESTAMP_LIMIT_SECONDS) {
          const found = candidate.sourcePolygons.every((a) => {
            return fire.sourcePolygons.find((b) => arePolygonsEqual(a, b))
          })

          if (found === true) {
            candidate._anglesByKey[getCameraKey(fire)] = true
            fire._anglesByKey[key] = true
          }
        }
      }
    }

    if  (fire._anglesByKey[key] === true) {
      console.log(key, getCameraKey(fire))
    }
  }

  return fire._anglesByKey[key] === true
}
