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

import getUrl from './getUrl.mjs';

/**
 * Constructs a server-sent events source for `endpoint` URL.
 *
 * @param {string} endpoint - The URL for the server-sent events source.
 * @param {Object} options - Settings for the server-sent events source.
 *
 * @returns {EventSource} The server-sent events source.
 */
export default function getEventSource(endpoint, options = {}) {
  if (process.env.NODE_ENV === 'development') {
    options.withCredentials = true; // Allow cross-origin requests.
  }

  return new EventSource(getUrl(endpoint), options);
}
