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

import {Application, Request, Response} from 'express';
import {DbMgr} from './db_mgr';
import {OCT_Config, OCT_PotentialFire} from './oct_types';
// Server-Sent Events (SSE) backend

import * as oct_utils from './oct_utils';

const logger = oct_utils.getLogger('sse');

// Interface versioning to ensure browser and nodejs are synced up
const SSE_INTERFACE_VERSION = 10;

// Array of all the connections to the frontend
type ConnectionInfo = {
  email: string;
  response: Response;
}
let connections: ConnectionInfo[] = [];

/**
 * Send SSE eventsource message using given client response
 */
async function sendEvent(potFire: OCT_PotentialFire, connectionInfo: ConnectionInfo, db: DbMgr) {
  potFire.version = SSE_INTERFACE_VERSION;

  // only show proto events to users with showProto prefs
  if (potFire.isProto) {
    if (!connectionInfo.email) {
      return;
    }
    const prefs = await oct_utils.getUserPreferences(db, connectionInfo.email);
    if (!prefs.showProto) {
      return;
    }
  }

  // add detail camera info, parse polygon, and associate user votes to potFire
  await oct_utils.augmentVotes(db, potFire, connectionInfo.email);

  // DB objects already have croppedUrl fixed, but this is needed for pubsub objects and is idempotent
  potFire.croppedUrl = potFire.croppedUrl.split(',')[0];

  let eventParts = [
    'id: ' + potFire.timestamp,
    'event: newPotentialFire',
    'data: ' + JSON.stringify(potFire),
    '', ''  // two extra empty strings to generate \n\n at the end
  ];
  let eventString = eventParts.join('\n');
  // logger.info('SendEvent', response.writableEnded, eventString);
  if (!connectionInfo.response.writableEnded) {
    connectionInfo.response.write(eventString);
  }
}

/**
 * Check if given SSE request has last-event-id to restore connection
 */
async function checkConnectionToRestore(request: Request, connectionInfo: ConnectionInfo, db: DbMgr, config: OCT_Config) {
  let prevTimestamp = 0;
  if (request.header('last-event-id')) {
    const eventId = parseInt(request.header('last-event-id') || '');
    logger.info('ConnectionToRestore', eventId);
    if (Number.isInteger(eventId)) {
      prevTimestamp = eventId;
    }
  }
  const sqlStr = `select * from alerts where timestamp > ${prevTimestamp} order by sortid desc, timestamp desc limit 100`;
  const potFireEvents = await db.query(sqlStr);
  potFireEvents.reverse().forEach(async (potFireEvent: Record<string,any>) => {
    const potFire = oct_utils.dbAlertToUiObj(potFireEvent);
    await oct_utils.augmentCameraInfo(db, config, potFire);
    sendEvent(potFire, connectionInfo, db);
  });
}

async function updateFromDetectAsync(db: DbMgr, config: OCT_Config, potFire: OCT_PotentialFire) {
  await oct_utils.augmentCameraInfo(db, config, potFire);
  connections.forEach(connectionInfo => {
    // clone potFire so any changes made by sendEvent for one connection doesn't affect other connections
    const copyPotFire = Object.assign({}, potFire);
    sendEvent(copyPotFire, connectionInfo, db);
  });
}

/**
 * Callback function used for when new messages about potential fires are received
 * from the ML based detection service.  Forward the data to all connected clients
 */
function updateFromDetect(db: DbMgr, config: OCT_Config, messageData: string) {
  let messageJson;
  try {
    messageJson = JSON.parse(messageData);
    console.log('msg', messageJson);
  } catch (e) {
    logger.error('unxpected data %s', messageData, e);
    return;
  }
  // add isRealTime flag to real-time detections coming from detection service
  messageJson.isRealTime = true;
  updateFromDetectAsync(db, config, messageJson);
}

/**
 * Initialize the SSE module (setup routes) and return callback function used for new potential fires
 * @return {function} Callback for new messages
 */
export function initSSE(config: OCT_Config, app: Application, db: DbMgr) {
  app.get('/fireEvents', async (request: Request, response: Response) => {
    request.setTimeout(50 * 60 * 1000); // extend default timeout of 2 minutes to 50 mins (1 hour is max)
    request.on("close", () => {
      if (!response.writableEnded) {
        response.end();
        logger.info("Stopped sending events.");
      }
      // remove this response from connections array as well as any others in writableEnded state
      connections = connections.filter(ci => ((ci.response !== response) && !ci.response.writableEnded));
      logger.info('SSE close.  Total %d', connections.length);
    });

    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('X-Accel-Buffering', 'no');
    response.writeHead(200);
    response.flushHeaders(); // flush the headers to establish SSE with client

    const connectionInfo: ConnectionInfo = {
      response: response,
      email: '',
    };
    try {
      const userInfo = await oct_utils.checkAuth(request, config);
      connectionInfo.email = userInfo.email;
    } catch (_) {}
    logger.info('SSE add %s.  Total %d', !!connectionInfo.email, connections.length);
    connections.push(connectionInfo);
    checkConnectionToRestore(request, connectionInfo, db, config);

    // fakeEvents(response);
  });
  return (messageData: string) => updateFromDetect(db, config, messageData);
}

if (process.env.CI) { // special exports for testing this module
  exports._testUpdate = updateFromDetect;
  exports._testConnections = (tc: ConnectionInfo[]) => {
    connections = tc;
  };
  exports.SSE_INTERFACE_VERSION = SSE_INTERFACE_VERSION;
}
