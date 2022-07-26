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

import arePolygonsEqual from './arePolygonsEqual.mjs'
import getCameraKey from './getCameraKey.mjs'

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
export default function hasAngleOfFire(a, b) {
  if (a._anglesByKey == null) {
    a._anglesByKey = {}
  }

  if (b._anglesByKey == null) {
    b._anglesByKey = {}
  }

  // XXX: Check both directions because fire events are not guaranteed to
  // arrive in order so `a` might be a subset of `b`, or vice versa.
  const has1 = _hasAngleOfFire(a, b)
  const has2 = _hasAngleOfFire(b, a)

  return has1 || has2
}

function _hasAngleOfFire(a, b) {
  const key = getCameraKey(a)

  if (a !== b && b._anglesByKey[key] == null) {
    if (a.sourcePolygons.length < b.sourcePolygons.length) {
      const found = a.sourcePolygons.every((a) => {
        return b.sourcePolygons.find((b) => arePolygonsEqual(a, b))
      })

      if (found === true) {
        a._anglesByKey[getCameraKey(b)] = b.sortId
        b._anglesByKey[key] = a.sortId
      }
    }
  }

  return b._anglesByKey[key] != null
}
