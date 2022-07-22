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

/**
 * Determines whether the polygon camera angles of fire event `a` are a strict
 * subset of `b`; each overlapping fire event will be annotated with an
 * `_anglesByKey` property indexing its related secondary events.
 *
 * @param {Object} a - A fire event to be inspected to find out if it is a
 *     strict subset of `b`.
 * @param {Object} b - A fire event that might overlap `a`.
 *
 * @returns {boolean} `true` if `candidate` polygons are a subset of `b`
 *     polygons; otherwise, `false`.
 */
export default function hasAngleOfFire(a, b, firesByKey) {
  const key = getCameraKey(a)

  if (a._anglesByKey == null) {
    a._anglesByKey = {}
  }

  if (b._anglesByKey == null) {
    b._anglesByKey = {}
  }

  if (a !== b && b._anglesByKey[key] == null) {
    if (a.sourcePolygons.length < b.sourcePolygons.length) {
      // XXX: Because `TIMESTAMP_LIMIT_SECONDS` only applies between successive
      // events, it’s possible for `b._anglesByKey` to contain events that
      // collectively span more than `TIMESTAMP_LIMIT_SECONDS`. Therefore, the
      // oldest known `b._anglesByKey` event or `b.timestamp` establishes the
      // actual limit for determining whether `a` is viewing the same detected
      // fire as `b`.
      const minTimestamp = Object.values(b._anglesByKey)
        .reduce((min, timestamp) => Math.min(min, timestamp), b.timestamp)

      if (a.timestamp <= minTimestamp) {
        // Could be off by a few minutes due to `timestamp` vs `sortId`.
        if (a.timestamp >= minTimestamp - TIMESTAMP_LIMIT_SECONDS) {
          const found = a.sourcePolygons.every((a) => {
            return b.sourcePolygons.find((b) => arePolygonsEqual(a, b))
          })

          if (found === true) {
            a._anglesByKey[getCameraKey(b)] = b.timestamp
            b._anglesByKey[key] = a.timestamp
          }
        }
      }
    }
  }

  return b._anglesByKey[key] != null
}
