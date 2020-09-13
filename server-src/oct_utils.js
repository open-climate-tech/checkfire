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

const fs = require('fs');
const winston = require('winston');
const util = require('util');
const sleep = util.promisify(setTimeout);
const jwt = require("jsonwebtoken");

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

/**
 * Read and parse the JSON config file specified in environment variable OCT_FIRE_SETTINGS
 * The variable may point to either local file system file or GCS file
 */
async function getConfig(gcp_storage) {
  const gsPath = gcp_storage.parsePath(process.env.OCT_FIRE_SETTINGS);
  var configStr
  if (gsPath) {
    configStr = await gcp_storage.getData(gsPath.bucket, gsPath.name);
  } else if (!fs.existsSync(process.env.OCT_FIRE_SETTINGS)) {
    return {};
  } else {
    configStr = fs.readFileSync(process.env.OCT_FIRE_SETTINGS);
  }
  const config = JSON.parse(configStr);
  // logger.info('config', config);
  return config;
}

/**
 * Check if the incoming request has a valid signed JWT cookie
 * @param {*} req
 * @param {*} config
 */
function checkAuth(req, config) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.cf_token, config.cookieJwtSecret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Check the DB to get the votes cast by given user (email) for given potential fire (camera, timestamp)
 * @param {db_mgr} db
 * @param {string} cameraID
 * @param {number} timestamp
 * @param {string} email
 */
async function getUserVotes(db, cameraID, timestamp, email) {
  let sqlStr = `select * from votes where cameraname='${cameraID}' and
                timestamp=${timestamp} and userid='${email}'`;
  return await db.query(sqlStr);
}

/**
 * Return the geographical region on interest (if any) saved by the given user
 * @param {db_mgr} db
 * @param {string} userID
 */
async function getUserRegion(db, userID) {
  let sqlStr = `select * from user_preferences where userid='${userID}'`;
  const dbRes = await db.query(sqlStr);
  const region = {};
  if (dbRes[0] && dbRes[0].toplat) {
    region.topLat = dbRes[0].toplat;
    region.leftLong = dbRes[0].leftlong;
    region.bottomLat = dbRes[0].bottomlat;
    region.rightLong = dbRes[0].rightlong;
  }
  return region;
}

exports.retryWrap = retryWrap;
exports.getLogger = getLogger;
exports.getConfig = getConfig;
exports.checkAuth = checkAuth;
exports.getUserVotes = getUserVotes;
exports.getUserRegion = getUserRegion;
