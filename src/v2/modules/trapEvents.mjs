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

import trapEvent from './trapEvent.mjs'

/**
 * Given a list of event types, returns a keyed collection of event handlers
 * that will stop the specified types of events from otherwise being handled.
 *
 * @param {string} types - A space-separated list of React event names (e.g.,
 *     `'onClick onDoubleClick'`).
 *
 * @param {Object=} handlers - An optional keyed collection to which the
 *     event-trapping handlers should be addded.
 *
 * @returns {Object} A keyed collection of callback functions that handle
 *     the events named by `types`.
 */
export default function tarpeEvents(types, handlers = {}) {
  return types.split(/\s+/).forEach((type) => (handlers[type] = trapEvent))
}
