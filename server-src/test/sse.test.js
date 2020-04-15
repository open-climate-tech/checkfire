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
const sse = require('../sse');

describe('WildfireCheck SSE test', function () {
    function genMockResp(cb) {
        return {
            finished: false,
            write: function mockRespWrite(eventString) {
                cb(eventString);
            }
        };
    }

    // beforeEach(function () {
    // });

    it('updates are sent to connection in proper format', function (done) {
        const msg = {
            timestamp: 123,
            foo: 'bar'
        };
        const msgString = JSON.stringify(msg);
        const mockResp = genMockResp(eventString => {
            assert(eventString);
            const eventParts = eventString.split('\n');
            assert.strictEqual(eventParts.length, 5);
            assert.strictEqual(eventParts[0].split(':')[0], 'id');
            assert.strictEqual(parseInt(eventParts[0].split(':')[1]), msg.timestamp);
            assert.strictEqual(eventParts[1], 'event: newPotentialFire');
            assert.strictEqual(eventParts[2].slice(0,6), 'data: ');
            assert.strictEqual(eventParts[2].slice(6), msgString);
            done();
        });
        sse._testConnections([mockResp]);
        sse._testUpdate(msgString);
    });

});
