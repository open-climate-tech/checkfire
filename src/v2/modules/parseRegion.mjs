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

const degreeRegex = '(-?\\d{0,3}(?:\\.[0-9]+)?)';
const regionRegExp = new RegExp(
  `^${degreeRegex},${degreeRegex},${degreeRegex},${degreeRegex}$`
);

/**
 * Validates `'south,north,west,east'` `region` string within northern and
 * western hemispheres; parses valid strings into a parameterized object.
 *
 * @param {string} region - String representation of a square map area (e.g.,
 * `'32.4,33.9,-118.3,-116.0'`).
 *
 * @returns {Object} A collection of latitudes and longitudes representing four
 *     sides (`{north, east, south, west}`) of a square region.
 *
 * @throws {Error} If `region` is invalid.
 */
export default function parseRegion(region) {
  const parsed = regionRegExp.exec(region);

  if (parsed == null) {
    throw new Error(`Invalid region: ${region}`);
  }

  // Latitudinal boundaries
  const north = parseFloat(parsed[2]);
  const south = parseFloat(parsed[1]);

  // Longitudinal boundaries
  const east = parseFloat(parsed[4]);
  const west = parseFloat(parsed[3]);

  // Validate latitudinal boundaries for northern hemisphere (0°..90°).
  if (north < 0) {
    throw new Error(
      `Invalid region: northern latitude is out of bounds: ${north} < 0°`
    );
  }

  if (north > 90) {
    throw new Error(
      `Invalid region: northern latitude is out of bounds: ${north} > 90°`
    );
  }

  if (south < 0) {
    throw new Error(
      `Invalid region: southern latitude is out of bounds: ${south} < 0°`
    );
  }

  if (south > 90) {
    throw new Error(
      `Invalid region: southern latitude is out of bounds: ${south} > 90°`
    );
  }

  if (north < south + 0.3) {
    throw new Error(
      `Invalid region: northern and southern latitudes are too close: ${north} < ${
        south + 0.3
      }`
    );
  }

  // Validate longitudinal boundaries for western hemisphere (-180°..0°).
  if (east < -180) {
    throw new Error(
      `Invalid region: eastern longitude is out of bounds: ${east} < -180°`
    );
  }

  if (east > 0) {
    throw new Error(
      `Invalid region: eastern longitude is out of bounds: ${east} > 0°`
    );
  }

  if (west < -180) {
    throw new Error(
      `Invalid region: western longitude is out of bounds: ${west} < -180°`
    );
  }

  if (west > 0) {
    throw new Error(
      `Invalid region: western longitude is out of bounds: ${west} > 0°`
    );
  }

  if (east < west + 0.3) {
    throw new Error(
      `Invalid region: eastern and western longitudes are too close: ${east} and ${
        west + 0.3
      }`
    );
  }

  return { east, north, south, west };
}
