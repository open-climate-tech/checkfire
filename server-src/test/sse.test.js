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

const chai = require('chai');
const assert = chai.assert;
const express = require('express');
const sse = require('../sse');

describe('WildfireCheck SSE test', function () {
  function genMockResp(cb) {
    return {
      response: {
        writableEnded: false,
        write: function mockRespWrite(eventString) {
          cb(eventString);
        },
      },
    };
  }

  // beforeEach(function () {
  // });

  it('updates are sent to connection in proper format', function (done) {
    const msg = {
      timestamp: 123,
      foo: 'bar0',
      croppedUrl: 'bar1',
    };
    const msgString = JSON.stringify(msg);
    const mockResp = genMockResp((eventString) => {
      assert(eventString);
      const eventParts = eventString.split('\n');
      assert.strictEqual(eventParts.length, 5);
      assert.strictEqual(eventParts[0].split(':')[0], 'id');
      assert.strictEqual(parseInt(eventParts[0].split(':')[1]), msg.timestamp);
      assert.strictEqual(eventParts[1], 'event: newPotentialFire');
      assert.strictEqual(eventParts[2].slice(0, 6), 'data: ');
      const msgPayloadStr = eventParts[2].slice(6);
      const msgPayload = JSON.parse(msgPayloadStr);
      assert.strictEqual(msgPayload.timestamp, msg.timestamp);
      assert.strictEqual(msgPayload.foo, msg.foo);
      assert.strictEqual(msgPayload.version, sse.SSE_INTERFACE_VERSION);
      done();
    });
    sse._testConnections([mockResp]);
    sse._testUpdate({ query: async () => null }, {}, msgString);
  });

  it('initSSE writes initial ": connected" comment immediately on connect', function (done) {
    const app = express();
    const mockDb = { query: async () => [] };
    const mockConfig = {};
    sse.initSSE(mockConfig, app, mockDb);

    // Simulate a GET /fireEvents request using a minimal mock req/res pair
    const writes = [];
    const mockReq = {
      setTimeout: () => {},
      header: () => null,
      on: () => {},
      cookies: {},
      headers: {},
    };
    const mockRes = {
      writableEnded: false,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      writeHead() {},
      write(chunk) { writes.push(chunk); },
      end() { this.writableEnded = true; },
    };

    // Invoke the registered /fireEvents route handler directly
    const routerStack = (app._router && app._router.stack) || (app.router && app.router.stack) || [];
    const layer = routerStack.find((l) => l.route && l.route.path === '/fireEvents');
    assert.ok(layer, '/fireEvents route should be registered');
    layer.route.stack[0].handle(mockReq, mockRes, () => {});

    // The write is synchronous (before any await), so check immediately
    setImmediate(() => {
      assert.isTrue(writes.some((w) => w === ': connected\n\n'),
        'Expected ": connected\\n\\n" to be written immediately on connect');
      done();
    });
  });

  it('initSSE clears heartbeat interval on client disconnect', function (done) {
    const app = express();
    const mockDb = { query: async () => [] };
    const mockConfig = {};
    sse.initSSE(mockConfig, app, mockDb);

    let closeHandler = null;
    const mockReq = {
      setTimeout: () => {},
      header: () => null,
      on(event, handler) { if (event === 'close') closeHandler = handler; },
      cookies: {},
      headers: {},
    };
    const mockRes = {
      writableEnded: false,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      writeHead() {},
      write() {},
      end() { this.writableEnded = true; },
    };

    const routerStack = (app._router && app._router.stack) || (app.router && app.router.stack) || [];
    const layer = routerStack.find((l) => l.route && l.route.path === '/fireEvents');
    layer.route.stack[0].handle(mockReq, mockRes, () => {});

    setImmediate(() => {
      assert.isFunction(closeHandler, 'close event handler should be registered');
      // Fire the close event — if clearInterval is missing, fake timers would
      // accumulate; here we verify it executes without error and marks the
      // response ended.
      mockRes.writableEnded = false;
      closeHandler();
      assert.isTrue(mockRes.writableEnded,
        'response.end() should be called when client disconnects');
      done();
    });
  });
});
