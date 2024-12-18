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

import getCssName from './getCssName.mjs';
import getCssValue from './getCssValue.mjs';

/**
 * Formats `styles` (e.g., `{paddingBottom: 24}`) as a valid style attribute
 * value (e.g., `'padding-bottom: 24px'`).
 *
 * @param {Object} styles - A collection of camel-cased CSS properties.
 *
 * @returns {string} A valid style attribute value.
 */
export default function renderStyles(styles) {
  return Object.entries(styles)
    .map(([k, v]) => `${getCssName(k)}: ${getCssValue(v)}`)
    .join('; ');
}
