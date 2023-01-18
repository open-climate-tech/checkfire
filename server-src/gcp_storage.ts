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

'use strict';
// Helper code for accessing GCS storage

const oct_utils = require('./oct_utils');

const logger = oct_utils.getLogger('gcp_storage');

import {Storage}  from '@google-cloud/storage';
const storage = new Storage();

const GS_URL_REGEXP = /^gs:\/\/([a-z0-9_.-]+)\/(.+)$/;

/**
 * Parse the given string path into bucket and name if it is GCS path
 * @param {string} path
 * @return {object} with bucket and name properties
 */
function parsePath(path: string) {
  const parsed = GS_URL_REGEXP.exec(path);
  if (parsed && Array.isArray(parsed)) {
    let name = parsed[2];
    if (name.endsWith('/')) { // strip the final / if any
      name = name.slice(0,name.length-1);
    }
    return {
      bucket: parsed[1],
      name: name,
    }
  }
}

/**
 * Read given GCS file and return contents as a string
 * @param {string} bucketName
 * @param {string} srcFilename
 * @return {string} file contents
 */
async function getData(bucketName: string, srcFilename: string) {
  let response = await storage
    .bucket(bucketName)
    .file(srcFilename)
    .download();
  return response.toString();
}

exports.getData = getData;
exports.parsePath = parsePath;
