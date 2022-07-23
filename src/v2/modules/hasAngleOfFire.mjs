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

const LIMIT_SECONDS = 15 * Duration.MINUTE / Duration.SECOND

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
      // XXX: `timestamp` is the date-time that an image was captured. `sortId`
      // is the date-time when the same image was processed and its potential
      // fire detected. A newer `timestamp` from one camera may get processed
      // before an older `timestamp` from another camera looking at the same
      // fire so we use `sortId` instead so that overlapping angles accumulate
      // in the expected order.

      // XXX: Because `LIMIT_SECONDS` only applies between successive events,
      // it’s possible for `b._anglesByKey` to contain events that collectively
      // span more than `LIMIT_SECONDS`. Therefore, the oldest known
      // `b._anglesByKey` event or `b.sortId` establishes the actual limit for
      // determining whether `a` is viewing the same detected fire as `b`.
      const minSortId = Object.values(b._anglesByKey)
        .reduce((min, sortId) => Math.min(min, sortId), b.sortId)

      if (a.sortId <= minSortId) {
        if (a.sortId >= minSortId - LIMIT_SECONDS) {
          const found = a.sourcePolygons.every((a) => {
            return b.sourcePolygons.find((b) => arePolygonsEqual(a, b))
          })

          if (found === true) {
            a._anglesByKey[getCameraKey(b)] = b.sortId
            b._anglesByKey[key] = a.sortId
          }
        }
      }
    }
  }

  return b._anglesByKey[key] != null
}
