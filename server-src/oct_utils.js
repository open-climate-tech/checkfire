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
 * Return the user preferences of the given user
 * @param {db_mgr} db
 * @param {string} userID
 */
async function getUserPreferences(db, userID) {
  const sqlStr = `select * from user_preferences where userid='${userID}'`;
  const dbRes = await db.query(sqlStr);
  const rawPrefs = dbRes && dbRes[0];
  let region = {};
  if (rawPrefs) {
    region = {
      topLat: rawPrefs.toplat || 0,
      leftLong: rawPrefs.leftlong || 0,
      bottomLat: rawPrefs.bottomlat || 0,
      rightLong: rawPrefs.rightlong || 0,
    }
  }
  return {
    region: region,
    webNotify: (rawPrefs && rawPrefs.webNotify) ? true : false,
  };
}

/**
 * Return boolean to indicate whether given user has labeler role
 * @param {db_mgr} db
 * @param {string} userID
 */
async function isUserLabeler(db, userID) {
  const sqlStr = `select islabeler from user_preferences where userid='${userID}'`;
  const dbRes = await db.query(sqlStr);
  if (dbRes[0]) {
    return Boolean(dbRes[0].islabeler);
  }
  return false;
}

/**
 * Get information about camera (name, direction) from the cameraID
 * @param {db_mgr} db
 * @param {string} cameraID
 */
async function getCameraInfo(db, cameraID) {
  const camInfo = {
    cameraName: cameraID,
    cameraDir: ''
  };

  // query DB to get human name
  const sqlStr = `select name from cameras where locationID = (select locationID from sources where name='${cameraID}')`;
  const camNameRes = await db.query(sqlStr);
  if (camNameRes && (camNameRes.length > 0)) {
    camInfo.cameraName = camNameRes[0].Name || camNameRes[0].name
  }

  // use mapping table to get human direction
  const cardinalHeadings = {
    'n': [0, 'North'],
    'e': [90, 'East'],
    's': [180, 'South'],
    'w': [270, 'West'],
    'ne': [45, 'Northeast'],
    'se': [135, 'Southeast'],
    'sw': [225, 'Southwest'],
    'nw': [315, 'Northwest'],
  }
  const regexMobo = /-([ns]?[ew]?)-mobo-c/;
  const parsed = regexMobo.exec(cameraID);
  if (parsed && Array.isArray(parsed)) {
    const camDirAbbr = parsed[1];
    camInfo.cameraDir = cardinalHeadings[camDirAbbr] ? cardinalHeadings[camDirAbbr][1] : camDirAbbr;
  }
  // logger.info('Camera namemap (%s -> %s,%s)', cameraID, camInfo.cameraName, camInfo.cameraDir);
  return camInfo;
}

async function augmentCameraPolygonVotes(db, potFire, userID) {
  // add camera metadata
  const camInfo = await getCameraInfo(db, potFire.cameraID);
  potFire.camInfo = camInfo;

  // parse polygon
  if (potFire.polygon && (typeof(potFire.polygon) === 'string')) {
    potFire.polygon = JSON.parse(potFire.polygon);
  }

  if (userID) {
    const existingVotesByUser = await getUserVotes(db, potFire.cameraID, potFire.timestamp, userID);
    if (existingVotesByUser && (existingVotesByUser.length > 0)) {
      const isRealFire = existingVotesByUser[0]['IsRealFire'] || existingVotesByUser[0]['isrealfire'];
      potFire.voted = !!isRealFire;
    }
  }
  return potFire;
}

function dbAlertToUiObj(dbEvent) {
  return {
    "timestamp": dbEvent.Timestamp || dbEvent.timestamp,
    "cameraID": dbEvent.CameraName || dbEvent.cameraname,
    "adjScore": dbEvent.AdjScore || dbEvent.adjscore,
    "annotatedUrl": dbEvent.ImageID || dbEvent.imageid,
    "croppedUrl": dbEvent.CroppedID || dbEvent.croppedid,
    "mapUrl": dbEvent.MapID || dbEvent.mapid,
    "polygon": dbEvent.polygon
  }
}

/**
 * Find the entry in allValues array that has the closest value to given desired value
 * @param {Array<Number>} allValues
 * @param {Number} desired
 */
function findClosest(allValues, desired, direction) {
  const closest = allValues.reduce((acc,value) => {
    let diff = Math.abs(value - desired);
    if (direction === 'positive' && (value < desired)) {
      return acc;
    } else if (direction === 'negative' && (value > desired)) {
      return acc;
    }
    return (acc.diff <= diff) ? acc : {diff: diff, value: value};
  }, {diff: Infinity, value: allValues[0]});
  return closest.value;
}

exports.retryWrap = retryWrap;
exports.getLogger = getLogger;
exports.getConfig = getConfig;
exports.checkAuth = checkAuth;
exports.getUserVotes = getUserVotes;
exports.getUserPreferences = getUserPreferences;
exports.isUserLabeler = isUserLabeler;
exports.augmentCameraPolygonVotes = augmentCameraPolygonVotes;
exports.dbAlertToUiObj = dbAlertToUiObj;
exports.findClosest = findClosest;
