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
 * Determines the relative direction of `end` from `start`.
 *
 * @param {Array} start - Origin latitude-longitude pair.
 * @param {Array} end - Destination latitude-longitude pair.
 *
 * @returns {number} The relative direction of `end` from `start` in degrees.
 */
export default function calculateBearing(start, end) {
  // θ = atan2(sin ∂λ ⋅ cos φ2 , cos φ1 ⋅ sin φ2 − sin φ1 ⋅ cos φ2 ⋅ cos ∂λ)

  // Translate degrees to radians.
  const latitude1 = start[0] * Math.PI / 180
  const longitude1 = start[1] * Math.PI / 180
  const latitude2 = end[0] * Math.PI / 180
  const longitude2 = end[1] * Math.PI / 180

  const deltaLongitude = longitude2 - longitude1
  const a = Math.cos(latitude2) * Math.sin(deltaLongitude)
  const b = Math.cos(latitude1) * Math.sin(latitude2)
    - Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(deltaLongitude)
  const radians = Math.atan2(a, b)
  const degrees = (radians * 180 / Math.PI + 360) % 360

  return degrees
}
