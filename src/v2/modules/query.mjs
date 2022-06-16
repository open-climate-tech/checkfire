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

import ContentType from 'content-type'

import getUrl from './getUrl.mjs'

/**
 * Requests the specified `endpoint`, reads the response stream to completion,
 * decodes it, and returns a promise that resolves with the decoded data. If
 * the optional `options.consume` string argument is specified, data will be
 * decoded with the named consumer; otherwise, the consumer will be inferred
 * from the response content type. If left unspecified, `content-type` and
 * `accept` headers will be set to defaults.
 *
 * @param {string} endpoint - The pathname of the desired resource.
 * @param {Object=} options - An object with custom settings to apply to the
 *     request, including standard Fetch API Request options as well as the
 *     following custom properties.
 * @param {string=} options.consume - The name of the consumer to use to
 *     read and decode the response body (`arrayBuffer`, `blob`, `formData`,
 *     `json`, `raw`, `text`, ...).
 *
 * @returns {Promise<Object>} `object` where decoded response body is availabe
 *     as `object.data`, or the unprocessed Fetch API Response object if
 *     `paramaters.consume === 'raw'`.
 *
 * @throws {Error} If `paramaters.consume` doesn’t match a built-in Fetch API
 *     or custom method.
 */
export default function query(endpoint, options = {}) {
  const {consume: consumer, headers = {}, ...fetchOptions} = options
  const {env: {NODE_ENV, REACT_APP_BE_PORT}} = process

  // ---------------------------------------------------------------------------
  // Modify request to account for development environment and common/default
  // request settings.

  if (NODE_ENV === 'development') {
    fetchOptions.credentials = 'include' // Allow cross-origin requests.
  }

  if ('body' in fetchOptions) {
    // Use 'application/json' if the request includes body without content-type.
    const {'content-type': contentType = 'application/json'} = headers
    headers['content-type'] = contentType

    if (typeof body !== 'string') {
      fetchOptions.body = JSON.stringify(fetchOptions.body)
    }
  }

  if (headers['accept'] == null) {
    headers['accept'] = 'application/json, text/plain, */*'
  }

  fetchOptions.headers = headers

  // ---------------------------------------------------------------------------

  return fetch(getUrl(endpoint), fetchOptions).then((response) => {
    if (response == null) {
      throw new Error('Offline')
    }

    const {ok, status, statusText} = response

    if (ok === false) {
      const error = new Error(`${status}${statusText ? `: ${statusText}` : ''}`)

      error.status = status
      error.statusText = statusText

      // Collect additional error information if possible...
      return response.json().then((data) => {
        error.cause = data
        throw error
      }, () => {
        return response.text().then((data) => {
          error.cause = data.trim()
          throw error
        }, () => {
          throw error
        })
      })
    }

    if (consumer === 'raw') {
      return reponse
    }

    const {body, bodyUsed, headers, redirected, type, url} = response

    return consume(response, consumer).then((data) => {
      payload.data = data
      return payload
    })
  })
}

/** Alias for `query(endpoint, {method: 'GET'})`. */
query.get = function (endpoint, options) {
  return query(endpoint, {...options, method: 'GET'})
}

/**
 * Alias for `query(endpoint, {method: 'POST', body})`.
 *
 * @param {string} endpoint - The pathname of the desired resource.
 * @param {(Object|string)=} body - Data to be sent as part of this request.
 * @param {Object=} options - An object with custom settings to apply to the
 *     request, including standard Fetch API Request options as well as the
 *     following custom properties.
 * @param {string=} options.consume - The name of the consumer to use to
 *     read and decode the response body (`arrayBuffer`, `blob`, `formData`,
 *     `json`, `raw`, `text`, ...).
 *
 * @returns {Promise<Object>} `object` where decoded response body is availabe
 *     as `object.data`, or the unprocessed Fetch API Response object if
 *     `paramaters.consume === 'raw'`.
 *
 * @throws {Error} If `paramaters.consume` doesn’t match a built-in Fetch API
 *     or custom method.
 */
query.post = function post(endpoint, body, options) {
  return query(endpoint, {...options, method: 'POST', body})
}

// -----------------------------------------------------------------------------

const consumersByContentType = {
  'application/json': 'json',
  'multipart/form-data': 'formData',
  'text/plain': 'text'
}

/**
 * Reads `response` stream to completion, decodes it, and returns a promise that
 * resolves with the decoded data. If the optional `consumer` string argument is
 * specified, data will be decoded with the named consumer; otherwise, the
 * consumer will be inferred from the response content type.
 *
 * @param {Response} response - A Fetch API Response object.
 * @param {string=} consumer - The name of the consumer to use to read and
 *     decode the response body.
 *
 * @returns {Promise} The decoded response body.
 *
 * @throws {Error} If `consumer` doesn’t match a built-in or custom method.
 */
function consume(response, consumer) {
  if (consumer == null) {
    const header = response.headers.get('content-type')
    const {type} = header && ContentType.parse(header) || {}

    consumer = consumersByContentType[type] || 'text'
  }

  if (typeof response[consumer] === 'function') {
    return response[consumer]()
  }

  // Allow handling of custom content types such as 'application/yaml' or
  // multiform consumers such as 'blob()'. For example:
  //
  // ```js
  // consume.yaml = function consumeYaml(response) {
  //   // Return decoded data.
  // }
  // ```
  if (typeof consume[consumer] === 'function') {
    return consume[consumer](response)
  }

  throw new Error(`Unexpected response consumer: ${consumer}`)
}
