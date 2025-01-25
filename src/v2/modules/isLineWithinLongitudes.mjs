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
 * Given a common `latitude`, determines whether any point on line segment
 * `line` is within `west` and `east` longitudes.
 *
 * @param {Array} line - Two vertices representing a line segement (i.e.,
 *     `[[lat1, long1], [lat2, long2]]`)
 * @param {number} east - The eastern longitudinal boundary.
 * @param {number} west - The western longitudinal boundary.
 * @param {number} latitude - A northern or southern boundary.
 *
 * @returns {boolean} `true` if `line` has a point within `west` and `east`
 *     longitudes; otherwise, `false`.
 */
export default function isLineWithinLongitudes(line, east, west, latitude) {
  const [[lat1, long1], [lat2, long2]] = line;
  const deltaHorizontal = lat2 - lat1;

  if (Math.abs(deltaHorizontal) < 0.01) {
    // Too close to horizontal.
    return false;
  }

  // Parameterized value on line segment where 0 represents `[lat1, long1]` and
  // 1 represents `[lat2, long2]`.
  const point = (latitude - lat1) / deltaHorizontal;

  if (point >= 0 && point <= 1) {
    // `latitude` is between the two endpoints. Check if intersection point is
    // within `west` and `east`.
    const intersection = (long2 - long1) * point + long1;
    return intersection >= west && intersection <= east;
  }

  return false;
}
