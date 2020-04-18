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
// Utility functions

const winston = require('winston');
const util = require('util');
const sleep = util.promisify(setTimeout);

/**
 * Create a winston logger with given label
 * @param {string} label
 */
function getLogger(label) {
  const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.label({label: label}), //module label
      winston.format.timestamp(),
      winston.format.splat(), // format strings e.g., %s, %d
      winston.format.json() // JSON for structured logging
    )
  });
  return logger;
}

const logger = getLogger('oct_utils');

/**
 * Retry the given function up to MAX_RETRIES with increasing delays until it succeeds
 * @param {function} mainFn 
 */
async function retryWrap(mainFn) {
  const MAX_RETRIES = 5;
  for (let retryNum = 1; retryNum <= MAX_RETRIES; retryNum++) {
    try {
      return await mainFn();
    } catch (err) {
      if (retryNum < MAX_RETRIES) {
        logger.warn('Failure %s.  Retry %d in %d seconds:', err.message, retryNum, retryNum);
        await sleep(retryNum * 1000);  
      } else {
        logger.error('Failure %s.  No more retries', err.message);
        throw new Error(err);
      }
    }
  }
}

exports.retryWrap = retryWrap;
exports.getLogger = getLogger;
