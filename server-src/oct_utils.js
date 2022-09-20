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
    if (!req.cookies.cf_token) {
      reject('missing cookie');
    }
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
      topLat: rawPrefs.topLat || rawPrefs.toplat || 0,
      leftLong: rawPrefs.leftLong || rawPrefs.leftlong || 0,
      bottomLat: rawPrefs.bottomLat || rawPrefs.bottomlat || 0,
      rightLong: rawPrefs.rightLong || rawPrefs.rightlong || 0,
    }
    if (region.topLat === 0 && region.leftLong === 0 && region.bottomLat === 0 && region.rightLong === 0) {
      region = null;
    }
  }
  return {
    region: region,
    webNotify: (rawPrefs && (rawPrefs.webNotify || rawPrefs.webnotify)) ? true : false,
    showProto: (rawPrefs && (rawPrefs.showProto || rawPrefs.showproto)) ? true : false,
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
 * @param {object} config
 * @param {string} cameraID
 */
async function getCameraInfo(db, config, cameraID) {
  const camInfo = {
    cameraName: cameraID,
    cameraDir: ''
  };

  // query DB to get human name
  const sqlStr = `select name, network, cityname, latitude, longitude from cameras where locationID = (select locationID from sources where name='${cameraID}')`;
  const camNameRes = await db.query(sqlStr);
  if (camNameRes && (camNameRes.length > 0)) {
    camInfo.cameraName = camNameRes[0].Name || camNameRes[0].name;
    camInfo.network = camNameRes[0].Network || camNameRes[0].network;
    camInfo.networkUrl = config.networkUrls && config.networkUrls[camInfo.network];
    camInfo.latitude = camNameRes[0].Latitude || camNameRes[0].latitude;
    camInfo.longitude = camNameRes[0].Longitude || camNameRes[0].longitude;
    const cameraUrls = config.cameraUrls && config.cameraUrls[camInfo.network];
    if (cameraUrls && cameraUrls.length === 2) {
      camInfo.camerakUrl = cameraUrls[0] + cameraID + cameraUrls[1];
    } else {
      camInfo.camerakUrl = '';
    }
    camInfo.cityName = camNameRes[0].CityName || camNameRes[0].cityname;
  }
  return camInfo;
}

function getCardinalHeading(heading) {
  // convert numerical heading to cardinal name
  const cardinalHeadings = {
    0: 'North',
    45: 'Northeast',
    90: 'East',
    135: 'Southeast',
    180: 'South',
    225: 'Southwest',
    270: 'West',
    315: 'Northwest',
  };
  const degreesPerHeading = 360/Object.keys(cardinalHeadings).length;
  const roundedHeading = (Math.round(heading/degreesPerHeading) * degreesPerHeading) % 360;
  return cardinalHeadings[roundedHeading];
}

async function augmentCameraInfo(db, config, potFire) {
  // add camera metadata
  const camInfo = await getCameraInfo(db, config, potFire.cameraID);
  potFire.camInfo = camInfo;

  // parse polygon and calculate direction
  if (potFire.polygon && typeof potFire.polygon === 'string') {
    potFire.polygon = JSON.parse(potFire.polygon);
    if (potFire.fireHeading === null) {
      // old fires in DB don't have fireHeading data.  Don't report any direction
      potFire.camInfo.cameraDir = '';
    } else {
      potFire.camInfo.cameraDir = getCardinalHeading(potFire.fireHeading);
    }
  }

  if (potFire.sourcePolygons) {
    if (typeof potFire.sourcePolygons === 'string') {
      potFire.sourcePolygons = JSON.parse(potFire.sourcePolygons)
    }
  } else {
    potFire.sourcePolygons = []
  }

  return potFire;
}

async function augmentVotes(db, potFire, userID) {
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
    timestamp: dbEvent.Timestamp || dbEvent.timestamp,
    cameraID: dbEvent.CameraName || dbEvent.cameraname,
    adjScore: dbEvent.AdjScore || dbEvent.adjscore,
    weatherScore: dbEvent.WeatherScore || dbEvent.weatherscore,
    annotatedUrl: dbEvent.ImageID || dbEvent.imageid,
    croppedUrl: (dbEvent.CroppedID || dbEvent.croppedid || '').split(',')[0],
    mapUrl: dbEvent.MapID || dbEvent.mapid,
    polygon: dbEvent.polygon,
    sourcePolygons: dbEvent.sourcePolygons || dbEvent.sourcepolygons,
    fireHeading: dbEvent.FireHeading || dbEvent.fireheading,
    isProto: dbEvent.IsProto || dbEvent.isproto,
    sortId: dbEvent.SortId || dbEvent.sortid
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

/**
 * Check the DB to get the user auth credentials
 * @param {db_mgr} db
 * @param {string} userID
 * @param {string} type
 */
 async function getUserAuth(db, userID, type) {
  const authQuery = `select type,hashedpassword,salt from auth where userid='${userID}' and type='${type}'`;
  return await db.query(authQuery);
}

/**
 * Transforms `path` into a development or production URL as appropriate.
 *
 * @param {('http:'|'https:')} protocol - The client’s request protocol.
 * @param {string} host - The hostname[:port] for a desired resource.
 * @param {string} path - The endpoint for a desired resource.
 *
 * @returns {string} A URL for the desired resource, tranformed for development
 *     if necessary.
 */
function getClientUrl(protocol, host, path) {
  return process.env.NODE_ENV === 'development' ? `${protocol}//${host}${path}` : path
}

exports.retryWrap = retryWrap;
exports.getLogger = getLogger;
exports.getConfig = getConfig;
exports.checkAuth = checkAuth;
exports.getUserVotes = getUserVotes;
exports.getUserPreferences = getUserPreferences;
exports.isUserLabeler = isUserLabeler;
exports.augmentCameraInfo = augmentCameraInfo;
exports.augmentVotes = augmentVotes;
exports.dbAlertToUiObj = dbAlertToUiObj;
exports.findClosest = findClosest;
exports.getUserAuth = getUserAuth;
exports.getClientUrl = getClientUrl;
