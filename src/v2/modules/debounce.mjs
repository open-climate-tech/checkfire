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
 * Prevents `callback` from being invoked more than once per repaint so that
 * processing time isn’t expended when it won’t be perceived by the user.
 *
 * @param {funciton(...?)} callback
 */
export default function debounce(callback) {
  let requestId

  // eslint-disable-next-line func-names
  return function (...argv) {
    const [event] = argv
    if (event && typeof event.persist === 'function') {
      // Preserve event properties so they can be accessed after debouncing.
      event.persist()
    }

    cancelAnimationFrame(requestId)
    requestId = requestAnimationFrame(() => callback.apply(this, argv))
  }
}
