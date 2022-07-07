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

const db_mgr = require('./db_mgr');
const apis = require('./apis');
const sse = require('./sse');
const pubsub = require('./pubsub_pull');
const gcp_storage = require('./gcp_storage');
const oct_utils = require('./oct_utils');
// const detectMgr = require('./detect_mgr');

const logger = oct_utils.getLogger('services');


/**
 * Initialize all the dyanmic services for this server and then call done()
 * @param {Express} app 
 * @param {function} done 
 */
async function initServices(app, done) {
  const config = await oct_utils.getConfig(gcp_storage);
  const db = await db_mgr.initDB(config);
  apis.initApis(config, app, db);
  const updateFromDetect = sse.initSSE(config, app, db);
  await pubsub.initPubSub(config, updateFromDetect);
  // detectMgr.initMgr(config);

  const redirects = ['/prototypes', '/preferences', '/confirmed', '/labelImage', '/selected', '/detected', '/login', '/register', '/v2/wildfirecheck'];
  redirects.forEach(redirectUrl => {
    app.get(redirectUrl, (req,res) => {res.redirect('/wildfirecheck/?redirect=' + redirectUrl);});
  });
  done();
}

exports.initServices = initServices;
