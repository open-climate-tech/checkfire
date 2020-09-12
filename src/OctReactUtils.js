/*
# Copyright 2020 Open Climate Tech Contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
*/

// Utility functions for react code

/**
 * Return the full URL for UI backend for given route
 * @param {string} path 
 */
export function getServerUrl(path) {
  const serverPrefix = (process.env.NODE_ENV === 'development') ?
    `http://localhost:${process.env.REACT_APP_BE_PORT}` : '';
  return serverPrefix + path;
}

/**
 * Make a GET API call to the UI backend to given URL
 * @param {string} serverUrl 
 */
export async function serverGet(serverUrl) {
  const getParams = {};
  if (process.env.NODE_ENV === 'development') {
    getParams.credentials = 'include'; //send cookies to dev server on separate port
  }
  return await fetch(serverUrl, getParams);
}

/**
 * Make POST API call to the UI backend to given URL with given body data
 * @param {string} serverUrl 
 * @param {json} body 
 */
export async function serverPost(serverUrl, body) {
  const postParams = {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
  }
  if (process.env.NODE_ENV === 'development') {
    postParams.credentials = 'include'; //send cookies to dev server on separate port
  }
  const resp = await fetch(serverUrl, postParams);
  return await resp.text();
}
