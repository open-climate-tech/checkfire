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
 * Given a common `longitude`, determines whether any point on line segment
 * `line` is within `north` and `south` latitudes.
 *
 * @param {Array} line - Two vertices representing a line segement (i.e.,
 *     `[[lat1, long1], [lat2, long2]]`)
 * @param {number} north - The northern latitudinal boundary.
 * @param {number} south - The southern latitudinal boundary.
 * @param {number} longitude - An eastern or western boundary.
 *
 * @returns {boolean} `true` if `line` has a point within `north` and `south`
 *     latitudes; otherwise, `false`.
 */
export default function hasPointWithinLatitudes(line, north, south, longitude) {
  const [[lat1, long1], [lat2, long2]] = line
  const deltaVertical = long2 - long1

  if (Math.abs(deltaVertical) < 0.01) {
    // Too close to vertical.
    return false
  }

  // Parameterized value on line segment where 0 represents `[lat1, long1]` and
  // 1 represents `[lat2, long2]`.
  const point = (longitude - long2) / deltaVertical

  if (point >= 0 && point <= 1) {
    // `longitude` is between the two endpoints. Check if intersection point is
    // within `north` and `south`.
    const intersection = (lat2 - lat1) * point + lat1
    return intersection >= south && intersection <= north
  }

  return false
}
