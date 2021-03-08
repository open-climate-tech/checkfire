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
// Server-Sent Events (SSE) backend

const oct_utils = require('./oct_utils');

const logger = oct_utils.getLogger('sse');

// Interface versioning to ensure browser and nodejs are synced up
const SSE_INTERFACE_VERSION = 6;

// Array of all the connections to the frontend
var connections = [];

/**
 * Send SSE eventsource message using given client response
 * @param {object} messageJson
 * @param {*} connectionInfo
 * @param {db_mgr} db
 */
async function sendEvent(messageJson, connectionInfo, db) {
  messageJson.version = SSE_INTERFACE_VERSION;

  // only show proto events to users with showProto prefs
  if (messageJson.isProto) {
    if (!connectionInfo.email) {
      return;
    }
    const prefs = await oct_utils.getUserPreferences(db, connectionInfo.email);
    if (!prefs.showProto) {
      return;
    }
  }

  // add detail camera info, parse polygon, and associate user votes to messageJson
  await oct_utils.augmentCameraPolygonVotes(db, messageJson, connectionInfo.email);

  let eventParts = [
    'id: ' + messageJson.timestamp,
    'event: newPotentialFire',
    'data: ' + JSON.stringify(messageJson),
    '', ''  // two extra empty strings to generate \n\n at the end
  ];
  let eventString = eventParts.join('\n');
  // logger.info('SendEvent', response.finished, eventString);
  if (!connectionInfo.response.finished) {
    connectionInfo.response.write(eventString);
  }
}

/**
 * Check if given SSE request has last-event-id to restore connection
 * @param {HTTP Request} request
 * @param {*} connectionInfo
 * @param {db_mgr} db
 */
async function checkConnectionToRestore(request, connectionInfo, db) {
  let prevTimestamp = 0;
  if (request.headers["last-event-id"]) {
    const eventId = parseInt(request.headers["last-event-id"]);
    logger.info('ConnectionToRestore', eventId);
    if (Number.isInteger(eventId)) {
      prevTimestamp = eventId;
    }
  }
  const sqlStr = `select * from alerts where timestamp > ${prevTimestamp} order by timestamp desc limit 20`;
  const potFireEvents = await db.query(sqlStr);
  potFireEvents.reverse().forEach(potFireEvent => {
    sendEvent(oct_utils.dbAlertToUiObj(potFireEvent), connectionInfo, db);
  });
}

/**
 * Callback function used for when new messages about potential fires are received
 * from the ML based detection service.  Forward the data to all connected clients
 * @param {db_mgr} db
 * @param {string} messageData - JSON stringified
 */
function updateFromDetect(db, messageData) {
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
  connections.forEach(connectionInfo => {
    sendEvent(messageJson, connectionInfo, db);
  });
}

/**
 * Initialize the SSE module (setup routes) and return callback function used for new potential fires
 * @param {object} config 
 * @param {Express} app
 * @param {db_mgr} db
 * @return {function} Callback for new messages
 */
 function initSSE(config, app, db) {
  app.get('/fireEvents', async (request, response) => {
    request.on("close", () => {
      if (!response.finished) {
        response.end();
        logger.info("Stopped sending events.");
      }
      // remove this response from connections array as well as any others in finished state
      connections = connections.filter(ci => ((ci.response !== response) && !ci.response.finished));
      logger.info('SSE close.  Total %d', connections.length);
    });

    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('X-Accel-Buffering', 'no');
    response.writeHead(200);
    response.flushHeaders(); // flush the headers to establish SSE with client

    const connectionInfo = {
      response: response
    };
    try {
      const userInfo = await oct_utils.checkAuth(request, config);
      connectionInfo.email = userInfo.email;
    } catch (_) {}
    logger.info('SSE add %s.  Total %d', !!connectionInfo.email, connections.length);
    connections.push(connectionInfo);
    checkConnectionToRestore(request, connectionInfo, db);

    // fakeEvents(response);
  });
  return messageData => updateFromDetect(db, messageData);
}

/**
 * Send a couple of sample images with time delay for UI testing
 * @param {HTTP respnose} response 
 */
function fakeEvents(response) {
  setTimeout(() => {
    sendEvent({
      "timestamp": 1234567890,
      "cameraID": "testCam1",
      "adjScore": 0.6,
      "annotatedUrl": "https://storage.googleapis.com/oct-fire-public/samples/ml-s-mobo-c__2020-01-07T09_33_15_Score.jpg"
    }, response);
  }, 4000);

  setTimeout(() => {
    sendEvent({
      "timestamp": 1234567891,
      "cameraID": "testCam2",
      "adjScore": 0.8,
      "annotatedUrl": "https://storage.googleapis.com/oct-fire-public/samples/bh-w-mobo-c__2020-01-30T11_48_16.jpg"
    }, response);
  }, 9000);
}

exports.initSSE = initSSE;
if (process.env.CI) { // special exports for testing this module
  exports._testUpdate = updateFromDetect;
  exports._testConnections = tc => {
    connections = tc;
  };
  exports.SSE_INTERFACE_VERSION = SSE_INTERFACE_VERSION;
}
