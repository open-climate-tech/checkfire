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

import getCameraKey from './getCameraKey.mjs'

/**
 * Finds the polygon in `fire`’s polygon camera angles that originates at the
 * same coordinates as the fire event itself.
 *
 * @param {Object} fire - The fire event to inspect.
 *
 * @returns {Array} The polygon originating at the fire event’s coordinates.
 *
 * @throws {Error} If a such a polygon isn’t found.
 */
export default function findPrimaryPolygon(fire) {
  const {camInfo: {latitude, longitude}, sourcePolygons} = fire

  for (let i = sourcePolygons.length - 1; i > -1; --i) {
    const polygon = sourcePolygons[i]
    if (polygon[0][0] === latitude && polygon[0][1] === longitude) {
      return polygon
    }
  }

  throw new Error(`Expected to find primary polygon for ${getCameraKey(fire)} starting at ${latitude}, ${longitude}`)
}
