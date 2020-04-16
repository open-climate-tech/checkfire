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

// Array of all the connections to the frontend
var connections = [];

/**
 * Send SSE eventsource message using given client response
 * @param {object} messageJson
 * @param {HTTP response} response 
 */
function sendEvent(messageJson, response) {
  let eventParts = [
    'id: ' + messageJson.timestamp,
    'event: newPotentialFire',
    'data: ' + JSON.stringify(messageJson),
    '', ''  // two extra empty strings to generate \n\n at the end
  ];
  let eventString = eventParts.join('\n');
  // console.log('SendEvent', response.finished, eventString);
  if (!response.finished) {
    response.write(eventString);
  }
}

/**
 * Check if given SSE request has last-event-id to restore connection
 * @param {HTTP Request} request 
 * @param {HTTP response} response 
 * @param {db_mgr} db
 */
async function checkConnectionToRestore(request, response, db) {
  let prevTimestamp = 0;
  if (request.headers["last-event-id"]) {
    const eventId = parseInt(request.headers["last-event-id"]);
    console.log('ConnectionToRestore', eventId);
    prevTimestamp = eventId;
    // TODO: calculate events to resend using SQL DB and send via sendEvent()
  }
  const sqlStr = `select * from alerts where timestamp > ${prevTimestamp} order by timestamp desc limit 5`;
  const potFireEvents = await db.query(sqlStr);
  potFireEvents.forEach(potFireEvent => {
    sendEvent({
      "timestamp": potFireEvent.Timestamp,
      "cameraID": potFireEvent.CameraName,
      "adjScore": potFireEvent.AdjScore,
      "annotatedUrl": potFireEvent.ImageID
    }, response);

  });
}

/**
 * Callback function used for when new messages about potential fires are received
 * from the ML based detection service.  Forward the data to all connected clients
 * @param {string} messageData - JSON stringified
 */
function updateFromDetect(messageData) {
  let messageJson = JSON.parse(messageData);
  connections.forEach(connection => {
    sendEvent(messageJson, connection);
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
  app.get('/fireEvents', (request, response) => {
    console.log(`Request /fireEvents`);
    request.on("close", () => {
      if (!response.finished) {
        response.end();
        console.log("Stopped sending events.");
      }
      // remove this response from connections array as well as any others in finished state
      connections = connections.filter(r => ((r !== response) && !r.finished));
    });

    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('X-Accel-Buffering', 'no');
    if (process.env.NODE_ENV === 'development') {
      console.log('Permissive CORS');
      response.setHeader("Access-Control-Allow-Origin", "*");
    }
    response.writeHead(200);
    response.flushHeaders(); // flush the headers to establish SSE with client

    checkConnectionToRestore(request, response, db);
    connections.push(response);

    // fakeEvents(response);
  });
  return updateFromDetect;
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
}
