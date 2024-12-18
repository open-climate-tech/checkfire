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

import getCameraKey from './getCameraKey.mjs';

/**
 * Compares the unique ID derived from `fireEvent` with `key`.
 *
 * @param {Object} fireEvent - The detected fire for which a unique camera ID
 *     should be checked.
 * @param {string} key - The unique ID to check `fireEvent` for.
 *
 * @returns {boolean} `true` if `fireEvent` has a unique ID equal to `key`;
 *     otherwise, `false`.
 */
export default function hasCameraKey(fireEvent, key) {
  return getCameraKey(fireEvent) === key;
}
