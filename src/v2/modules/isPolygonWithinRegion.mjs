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

import isLineWithinLatitudes from './isLineWithinLatitudes.mjs'
import isLineWithinLongitudes from './isLineWithinLongitudes.mjs'

/**
 * Determines whether `region` contains some or all of `polygon`.
 *
 * @param {Array} polygon - A collection of vertices representing a plane with
 *     at least three straight sides and angles.
 * @param {Object} region - A collection of latitudes and longitudes
 *     representing four sides of a square region.
 *
 * @returns {boolean} `true` is any vertex or edge of `polygon` lies within or
 *     intersects with `region`; otherwise, `false`.
 */
export default function isWithinRegion(polygon, region) {
  const {east, north, south, west} = region

  // Northern hemisphere
  let minLat = 90
  let maxLat = 0

  // Western hemisphere
  let minLong = 0;
  let maxLong = -180

  for (let i = 0, n = polygon.length; i < n; ++i) {
    const [x, y] = polygon[i]

    minLat = Math.min(minLat, x)
    maxLat = Math.max(maxLat, x)
    minLong = Math.min(minLong, y)
    maxLong = Math.max(maxLong, y)

    if (x >= south && x <= north && y >= west && y <= east) {
      // Vertex is within region.
      return true
    }
  }

  if (minLat > north || maxLat < south || minLong > east || maxLong < west) {
    // Every vertex is outside of `region`.
    return false
  }

  // `polygon` may have a diagonal edge crossing a corner of `region`. Check
  // every line segment of `polygon` for intersection with `region` rectangle.
  return null != polygon.find((vertex, i) => {
    const nextVertex = polygon[(i + 1) % polygon.length]
    const line = [vertex, nextVertex]

    return isLineWithinLongitudes(line, east, west, north)
      || isLineWithinLongitudes(line, east, west, south)
      || isLineWithinLatitudes(line, north, south, west)
      || isLineWithinLatitudes(line, north, south, east)
  })

  // TODO: Even without intersecting line segments, areas may overlap if
  // `polygon` completely encapsulates `region`. Ignore this possibility on the
  // assumption that users select regions at least 10×10 miles square.
}
