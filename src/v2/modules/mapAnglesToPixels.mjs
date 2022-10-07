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
 * Given `map` and angular coordinates `lat` and `lng`, calculates pixel
 * coordinates relative to the `map` HTML container.
 *
 * @param {Object} map - A Leaflet `Map` instance.
 * @param {number} lat - An angular latitude coordinate.
 * @param {number} lng - An angular longitude coordinate.
 *
 * @returns {{x: number, y: number}} A Leaflet `Point` instance.
 */
export default function mapAnglesToPixels(map, lat, lng) {
  return map.latLngToContainerPoint(window.L.latLng(lat, lng))
}
