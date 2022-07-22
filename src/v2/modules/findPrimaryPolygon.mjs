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

/**
 * Finds the polygon in `fire`’s polygon camera angles that originates at the
 * same coordinates as the fire event itself.
 *
 * @param {Object} fire - The fire event to inspect.
 *
 * @returns {Array} The polygon originating at the fire event’s coordinates.
 */
export default function findPrimaryPolygon(fire) {
  const {sourcePolygons} = fire
  return sourcePolygons[sourcePolygons.length - 1]
}
