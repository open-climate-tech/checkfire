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
 * Determines the point equidistant between `start` and `end`.
 *
 * @param {Array} start - Origin latitude-longitude pair.
 * @param {Array} end - Destination latitude-longitude pair.
 *
 * @returns {Array} The latitude-longitude pair between `start` and `end`.
 */
export default function calculateMidpoint(start, end) {
  // Bx = cos φ2 ⋅ cos ∂λ
  // By = cos φ2 ⋅ sin ∂λ
  // φm = atan2(sin φ1 + sin φ2, √(cos φ1 + Bx)² + By²)
  // λm = λ1 + atan2(By, cos(φ1) + Bx)

  // Translate degrees to radians.
  const latitude1 = start[0] * Math.PI / 180
  const longitude1 = start[1] * Math.PI / 180
  const latitude2 = end[0] * Math.PI / 180
  const longitude2 = end[1] * Math.PI / 180

  const x = Math.cos(latitude2) * Math.cos(longitude2 - longitude1)
  const y = Math.cos(latitude2) * Math.sin(longitude2 - longitude1)
  const latitudeRadians = Math.atan2(Math.sin(latitude1) + Math.sin(latitude2),
    Math.sqrt((Math.cos(latitude1) + x) * (Math.cos(latitude1) + x) + y * y))
  const longitudeRadians = longitude1 + Math.atan2(y, Math.cos(latitude1) + x)
  const latitude = (latitudeRadians * 180 / Math.PI + 360) % 360
  const longitude = (longitudeRadians * 180 / Math.PI + 360) % 360

  return [latitude, longitude]
}
