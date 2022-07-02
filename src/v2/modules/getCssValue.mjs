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
 * Formats `value` (e.g., `24`) as a CSS string (e.g., `'24px'`).
 *
 * @param {(number|string)} value - A JavaScript value.
 *
 * @returns {string} A CSS value string.
 */
export default function getCssValue(value) {
  return typeof value === 'number' ? `${value}px` : value
}
