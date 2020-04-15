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
// Dyanmic services for UI backend server

const fs = require('fs');
const apis = require('./apis');
const sse = require('./sse');
const pubsub = require('./pubsub_pull');
const gcp_storage = require('./gcp_storage');

/**
 * Read and parse the JSON config file specified in environment variable OCT_FIRE_SETTINGS
 * The variable may point to either local file system file or GCS file
 */
async function getConfig() {
  const gsPath = gcp_storage.parsePath(process.env.OCT_FIRE_SETTINGS);
  var configStr
  if (gsPath) {
    configStr = await gcp_storage.getData(gsPath.bucket, gsPath.name);
  } else {
    configStr = fs.readFileSync(process.env.OCT_FIRE_SETTINGS);
  }
  const config = JSON.parse(configStr);
  // console.log('config', config);
  return config;
}

/**
 * Initialize all the dyanmic services for this server and then call done()
 * @param {Express} app 
 * @param {function} done 
 */
async function initServices(app, done) {
  const config = await getConfig();
  apis.initApis(config, app);
  const updateFromDetect = sse.initSSE(config, app);
  await pubsub.initPubSub(config, updateFromDetect);
  done();
}

exports.initServices = initServices;
