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

import {Application, Request, Response} from "express";

import {DbMgr} from "./db_mgr";
import * as apis from './apis';
import * as sse from './sse';
import * as pubsub from './pubsub_pull';
import * as oct_utils from './oct_utils';

const logger = oct_utils.getLogger('services');


/**
 * Initialize all the dyanmic services for this server and then call done()
 */
export async function initServices(app: Application, done: () => void) {
  const config = await oct_utils.getConfig();
  const db = new DbMgr(config);
  apis.initApis(config, app, db);
  const updateFromDetect = sse.initSSE(config, app, db);
  await pubsub.initPubSub(config, updateFromDetect);
  // detectMgr.initMgr(config);

  const redirects = ['/authenticated', '/prototypes', '/preferences', '/confirmed', '/labelImage', '/selected', '/detected', '/login', '/register', '/v2/wildfirecheck', '/v2/wildfirecheck/preferences'];
  redirects.forEach(redirectUrl => {
    app.get(redirectUrl, (req: Request, res: Response) => {
      let params: string[] = [];
      Object.keys(req.query).forEach(key => {
        params.push(`${key}=${req.query[key]}`)
      });
      const paramsStr = params.length ? `?${params.join('&')}` : '';
      const newUrl = `/wildfirecheck/?redirect=${redirectUrl}${encodeURIComponent(paramsStr)}`;
      res.redirect(newUrl);
    });
  });
  done();
}
