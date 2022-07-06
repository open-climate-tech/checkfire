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

const caseSeparatorRegExp = /([a-z])([A-Z])/g

/**
 * Formats `key` (e.g., `'camelCase'`) as a CSS name (e.g., `'camel-case'`).
 *
 * @param {string} key - A camel-cased JavaScript key.
 *
 * @returns {string} A lowercase dashed CSS name.
 */
export default function getCssName(key) {
  return key.replace(caseSeparatorRegExp, '$1-$2').toLowerCase()
}
