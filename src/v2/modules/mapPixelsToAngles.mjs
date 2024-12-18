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
 * Given `map` and pixel coordinates `x` and `y` relative to the `map` HTML
 * container, calculates angular coordinates.
 *
 * @param {Object} map - A Leaflet `Map` instance.
 * @param {number} x - A horizontal pixel coordinate.
 * @param {number} y - A vertical pixel coordinate.
 *
 * @returns {{lat: number, lng: number}} A Leaflet `LatLng` instance.
 */
export default function mapPixelsToAngles(map, x, y) {
  return map.containerPointToLatLng(window.L.point(x, y));
}
