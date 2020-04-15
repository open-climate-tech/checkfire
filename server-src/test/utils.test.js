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
const oct_utils = require('../oct_utils');

describe('OCT utils', function () {
    // beforeEach(function () {
    // });
    let failureCount = 0;
    function genFnCounter(failuresLeft, cb) {
        return function() {
            if (failuresLeft === 0) {
                return cb();
            }
            failuresLeft --;
            failureCount ++;
            throw new Error('fail num' + failuresLeft);
        }
    }

    it('retryWrap calls successful function once and returns value', function (done) {
        failureCount = 0;
        oct_utils.retryWrap(genFnCounter(0, async () => {
            return 1;
        })).then(res => {
            assert.strictEqual(failureCount, 0);
            assert.strictEqual(res, 1);
            done();
        });
    });
    
    it('retryWrap handles single failure', function (done) {
        failureCount = 0;
        oct_utils.retryWrap(genFnCounter(1, async () => {
            return 12;
        })).then(res => {
            assert.strictEqual(failureCount, 1);
            assert.strictEqual(res, 12);
            done();
        });
    });

    it('retryWrap gives up after 5 tries', function (done) {
        this.timeout(15000);
        failureCount = 0;
        oct_utils.retryWrap(genFnCounter(10, async () => {
            return 123;
        })).then(res => {
            assert.fail('should not reach');
        }).catch(res => {
            assert(res instanceof Error);
            assert.strictEqual(failureCount, 5);
            done();
        });
    });
});
