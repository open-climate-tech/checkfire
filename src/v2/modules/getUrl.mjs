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
 * Transforms `endpoint` into a development or production URL as apporpriate.
 *
 * @param {string} endpoint - The path for a desired resource.
 *
 * @returns {string} A URL for the desired resource, tranformed for development
 *     if necessary.
 */
export default function getUrl(endpoint) {
  return process.env.NODE_ENV === 'development'
    ? `http://localhost:${process.env.REACT_APP_BE_PORT}${endpoint}`
    : endpoint
}
