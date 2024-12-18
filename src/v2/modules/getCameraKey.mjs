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
 * Extracts values from `fireEvent` to construct a unique ID.
 *
 * @param {Object} fireEvent - The detected fire from which a unique camera ID
 *     should be derived.
 *
 * @returns {string} A unique camera ID suitable for React keys and the like.
 */
export default function getCameraKey(fireEvent) {
  const { cameraID, timestamp } = fireEvent;
  return `${cameraID}:${timestamp}`;
}
