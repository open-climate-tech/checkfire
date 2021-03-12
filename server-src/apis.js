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
// API Services clients can invoke

const oct_utils = require('./oct_utils');
const logger = oct_utils.getLogger('api');
const {google} = require('googleapis');
const jwt = require("jsonwebtoken");
const { assert } = require('chai');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');

const scopes = [
  'email',
  // 'profile'
];

const cameraHpwrenRegex = /^[0-9a-z\-]+\-mobo-c$/;

/**
 * Verify that request has a valid signed JWT cookie
 * @param {*} req
 * @param {*} res
 * @param {*} config
 */
async function verifyAuth(req, res, config) {
  try {
    const decoded = await oct_utils.checkAuth(req, config);
    return decoded;
  } catch (err) {
    console.log('jwt verify err', err);
    res.status(403).send('Forbidden').end();
  }
}


async function apiWrapper(req, res, config, apiDesc, cb) {
  logger.info(apiDesc);
  let decoded;
  try {
    decoded = await verifyAuth(req, res, config);
    cb(decoded);
  } catch (err) {
    logger.error('%s failure: %s', apiDesc, err);
    if (decoded) { // non-decoded cases get errored out in verifyAuth
      res.status(400).send('Bad Request').end();
    }
  }
}

/**
 * Initialize all the API routes
 * @param {object} config
 * @param {Express} app
 * @param {db_mgr} db
 */
function initApis(config, app, db) {
  // This route is just a stub for testing.
  app.get('/api/testGet', async (req, res) => {
    logger.info('GET testGet');
    try {
      const decoded = await verifyAuth(req, res, config);
      res
        .status(200)
        .send('Hello, m24.1610 world!')
        .end();
    } catch (err) {
    }
  });

  app.post('/api/testPost', async (req, res) => {
    logger.info('POST testPost');
    try {
      const decoded = await verifyAuth(req, res, config);
      console.log('body', req.body);
      res.status(200).send('success').end();
    } catch (err) {
    }
  });

  const redirectUrl = (process.env.NODE_ENV === 'development') ?
                       "http://localhost:5000/oauth2callback" :
                       config.webOauthCallbackURL;
  const oauth2Client = new google.auth.OAuth2(
    config.webOauthClientID,
    config.webOauthClientSecret,
    redirectUrl
  );

  /**
   * Generate the Google Oauth URL to authenticate user.
   * On successful oauth completion, this will redirect user to /oauth2callback below
   */
  app.get('/api/oauthUrl', async (req, res) => {
    try {
      logger.info('GET /api/oauthUrl %s', JSON.stringify(req.query));
      const url = oauth2Client.generateAuthUrl({
          scope: scopes,
          state: req.query.path,
          code_challenge_method: 'S256',
          code_challenge: config.webOauthCodeChallenge,
      });
      logger.info('goog url %s', url);
      res
        .status(200)
        .send(url)
        .end();
    } catch (err) {
      logger.error('Failure %s', err.message);
      res.status(400).end();
    }
  });

  /**
   * User just finished Google Oauth, now generate signed JWT as send as cookie for stateless auth.
   * And redirect the web browser to desired client URL
   */
  app.get('/oauth2callback', async (req, res) => {
    try {
      logger.info('GET /oauth2callback: %s', JSON.stringify(req.query));

      // verify code and get token.email
      const code = req.query.code;
      const {tokens} = await oauth2Client.getToken({code: code, codeVerifier: config.webOauthCodeVerifier});
      // logger.info('tokens: %s', JSON.stringify(tokens));
      const tokId = jwt.decode(tokens.id_token);
      logger.info('tokId: %s', JSON.stringify(tokId));
      logger.info('email: %s', tokId.email);

      // now generate signed JWT to send as cookie to client
      const expiration = '7d';
      const signed = jwt.sign({email: tokId.email}, config.cookieJwtSecret, { expiresIn: expiration });
      const cookieOptions = {
        // httpOnly: true, // cannot use this because client JS checks this to see user is authenticated already
        // expires: expiration, // expiration of cookie shoud match JWT, but currently pushing work to client JS
      };
      if (process.env.NODE_ENV !== 'development') {
        cookieOptions.secure = true;
      }
      res.cookie('cf_token', signed, cookieOptions);

      // finally, send client browser to desired URL specified in state by leveraging react redirect in client JS
      const state = req.query.state;
      res.redirect('/wildfirecheck?redirect=' + state);
    } catch (err) {
      logger.error('Failure %s', err.message);
      res.status(400).end();
    }
  });

  if (process.env.NODE_ENV === 'development') {
    // For easier testing, this endpoint creates a valid JWT without Oauth
    app.get('/api/devlogin', async (req, res) => {
      logger.info('GET /devlogin: %s', JSON.stringify(req.query));

      // now generate signed JWT to send as cookie to client
      const expiration = '1d';
      const signed = jwt.sign({email: req.query.email}, config.cookieJwtSecret, { expiresIn: expiration });
      const cookieOptions = {};
      res.cookie('cf_token', signed, cookieOptions);
      res.status(200).send('success').end();
    });
  }

  app.post('/api/voteFire', async (req, res) => {
    apiWrapper(req, res, config, 'POST voteFire', async decoded => {
      assert(req.body.cameraID && req.body.timestamp && (req.body.isRealFire !== undefined));

      // cameraID validation
      assert(typeof(req.body.cameraID) === 'string');

      // timestamp validation
      assert(typeof(req.body.timestamp) === 'number');
      assert(req.body.timestamp > 1510001000); // Nov 2017
      assert(req.body.timestamp < new Date().valueOf()/1000);

      assert(typeof(req.body.isRealFire) === 'boolean');

      // validate given info matches an alert
      const alertsQuery = `select * from alerts where timestamp=${req.body.timestamp} and cameraname='${req.body.cameraID}'`;
      const matchingAlerts = await db.query(alertsQuery);
      assert(matchingAlerts.length === 1);

      const existingVotesByUser = await oct_utils.getUserVotes(db, req.body.cameraID, req.body.timestamp, decoded.email);
      // console.log('voteFire existingVotesByUser %s', JSON.stringify(existingVotesByUser));
      if (existingVotesByUser && (existingVotesByUser.length > 0)) {
        logger.warn('Multiple votes not supported %s', existingVotesByUser);
        res.status(400).send('Bad Request').end();
        return;
      }
      const sqlStr = `insert into votes (cameraname,timestamp,isrealfire,userid) values
                      ('${req.body.cameraID}',${req.body.timestamp},${req.body.isRealFire ? 1 : 0},'${decoded.email}')`;
      await db.query(sqlStr);
      res.status(200).send('success').end();
    });
  });

  /**
   * Still here to support older web clients
   * TODO: delete
   * Return the geographical region on interest (if any) saved by the user
   */
  app.get('/api/getRegion', async (req, res) => {
    apiWrapper(req, res, config, 'GET getRegion', async decoded => {
      const preferences = await oct_utils.getUserPreferences(db, decoded.email);
      console.log('getRegion existing %s', JSON.stringify(preferences.region));
      res.status(200).send(preferences.region).end();
    });
  });

  /**
   * Return user preferences saved by the user
   * 1. the geographical region on interest (if any)
   * 2. webNotify
   */
  app.get('/api/getPreferences', async (req, res) => {
    apiWrapper(req, res, config, 'GET getPreferences', async decoded => {
      const preferences = await oct_utils.getUserPreferences(db, decoded.email);
      console.log('getPreferences existing %s', JSON.stringify(preferences));
      const result = {
        region: preferences.region,
        webNotify: preferences.webNotify,
      }
      res.status(200).send(result).end();
    });
  });

  /**
   * Save the given geographical region for future reference for current user.
   */
  app.post('/api/setRegion', async (req, res) => {
    apiWrapper(req, res, config, 'POST setRegion', async decoded => {
      assert(typeof(req.body.topLat) === 'number');
      assert(typeof(req.body.leftLong) === 'number');
      assert(typeof(req.body.bottomLat) === 'number');
      assert(typeof(req.body.rightLong) === 'number');

      const regionKeys = ['toplat', 'leftlong', 'bottomlat', 'rightlong'];
      const regionVals = [req.body.topLat, req.body.leftLong, req.body.bottomLat, req.body.rightLong];
      await db.insertOrUpdate('user_preferences', regionKeys, regionVals, 'userid', decoded.email);
      res.status(200).send('success').end();
    });
  });

  /**
   * Save user preference on whether they want to HTML5 notifications
   */
  app.post('/api/setWebNotify', async (req, res) => {
    apiWrapper(req, res, config, 'POST setWebNotify', async decoded => {
      assert(typeof(req.body.webNotify) === 'boolean');
      assert((req.body.webNotify === true) || (req.body.webNotify === false));

      await db.insertOrUpdate('user_preferences', ['webnotify'], [req.body.webNotify ? 1 : 0], 'userid', decoded.email);
      res.status(200).send('success').end();
    });
  });

  /**
   * Get a list of recently fires with majority positive votes along with voting stats
   */
  app.get('/api/confirmedFires', async (req, res) => {
    logger.info('GET confirmedFires');
    const nowSeconds = Math.round(new Date().valueOf()/1000);
    const minTimestamp = nowSeconds - 3600*24*30; // check last 30 days
    const sqlStr = `select * from
                      (select * from
                        (select cameraname,timestamp,avg(isrealfire) as avgrf,count(*) as ct from votes
                          where timestamp > ${minTimestamp} group by cameraname,timestamp) as q0
                        where avgrf > 0.49 order by timestamp desc limit 20) as vt
                      join alerts
                        on vt.cameraname=alerts.cameraname and vt.timestamp=alerts.timestamp
                      order by vt.timestamp desc`;
    const dbRes = await db.query(sqlStr);
    const fireEvents = await Promise.all(dbRes.map(async dbEntry => {
      const fireEvent = oct_utils.dbAlertToUiObj(dbEntry);
      fireEvent.avgVote = dbEntry.avgrf;
      fireEvent.numVotes = dbEntry.ct;
      return await oct_utils.augmentCameraPolygonVotes(db, fireEvent);
    }));
    res.status(200).send(fireEvents).end();
  });

  /**
   * Get a list of selected fires
   */
  app.get('/api/selectedFires', async (req, res) => {
    logger.info('GET selectedFires');
    const fireName = 'comet';
    const sqlStr = `select * from
                      (select nf.cameraname as cameraname, nf.timestamp as timestamp, avg(isrealfire) as avgrf, count(*) as ct from
                        (select * from named_fires where firename='${fireName}' order by timestamp desc limit 20) as nf
                        join votes
                          on nf.cameraname=votes.cameraname and nf.timestamp=votes.timestamp group by nf.cameraname,nf.timestamp) as nfv
                      join alerts
                        on nfv.cameraname=alerts.cameraname and nfv.timestamp=alerts.timestamp
                      order by nfv.timestamp desc`;
    const dbRes = await db.query(sqlStr);
    const fireEvents = await Promise.all(dbRes.map(async dbEntry => {
      const fireEvent = oct_utils.dbAlertToUiObj(dbEntry);
      fireEvent.avgVote = dbEntry.avgrf;
      fireEvent.numVotes = dbEntry.ct;
      return await oct_utils.augmentCameraPolygonVotes(db, fireEvent);
    }));
    res.status(200).send(fireEvents).end();
  });

  /**
   * Return list of available cameras
   */
  app.get('/api/listCameras', async (req, res) => {
    apiWrapper(req, res, config, 'GET listCameras', async decoded => {
      const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
      assert(isLabeler);
      const sqlStr = `select name from sources order by name`;
      const dbRes = await db.query(sqlStr);
      const cameraIDs = dbRes.map(dbEntry => dbEntry.name);
      res.status(200).send(cameraIDs).end();
    });
  });

  /**
   * Get URL for image from given camera at given time.
   * This code could work directly from the client, except browser CORS restrictions prevent fetching image archives
   */
  app.get('/api/fetchImage', async (req, res) => {
    /***
     * Parse out timestamps from HTTP directory listing of HPWREN archive "Q" directory
     * @param {string} text
     */
    function parseTimeFiles(text) {
      const timeFileRegex = /href="(1\d{9})\.jpg"/g;
      const list = [];
      let entry;
      while (entry = timeFileRegex.exec(text)) {
        list.push(parseInt(entry[1]));
      }
      return list;
    }

    /**
     * Get the timestamps of files in given URL of HPWREN archive directory
     * @param {string} hpwrenUrlDir
     */
    async function getTimeFiles(hpwrenUrlDir) {
      const resp = await fetch(hpwrenUrlDir);
      const dirText = await resp.text();
      return parseTimeFiles(dirText);
    }

    apiWrapper(req, res, config, 'GET fetchImage', async decoded => {
      const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
      assert(isLabeler);
      assert(cameraHpwrenRegex.test(req.query.cameraID));
      const dateTime = DateTime.fromISO(req.query.dateTime).setZone(config.timeZone);
      assert(dateTime.isValid);
      assert((req.query.direction === 'positive') || (req.query.direction === 'negative') || (req.query.direction === ''));
      const yearStr = dateTime.year.toString();
      const monthStr = dateTime.month.toString().padStart(2,'0');
      const dateStr = dateTime.day.toString().padStart(2,'0');
      const fullDate = yearStr + monthStr + dateStr;
      const qStr = 'Q' + Math.floor(dateTime.hour/3 + 1);
      let hpwrenUrlDir = `http://c1.hpwren.ucsd.edu/archive/${req.query.cameraID}/large/${yearStr}/${fullDate}/${qStr}/`;
      logger.info('fetchImage hpwrenUrlDir %s', hpwrenUrlDir);
      let timeFiles = await getTimeFiles(hpwrenUrlDir);
      if (!timeFiles.length) { // retry without year directory
        hpwrenUrlDir = `http://c1.hpwren.ucsd.edu/archive/${req.query.cameraID}/large/${fullDate}/${qStr}/`;
        logger.info('fetchImage retry hpwrenUrlDir %s', hpwrenUrlDir);
        timeFiles = await getTimeFiles(hpwrenUrlDir);
      }
      const result = {};
      if (timeFiles.length) {
        const closest = oct_utils.findClosest(timeFiles, Math.round(dateTime.valueOf()/1000), req.query.direction);
        const closestDate = DateTime.fromSeconds(closest).setZone(config.timeZone);
        const imageUrl = hpwrenUrlDir + closest + '.jpg';
        logger.info('fetchImage imageUrl %s', imageUrl);
        result.imageUrl = imageUrl;
        result.imageTime = closestDate.toUTC().toISO();
        result.imageName = req.query.cameraID + '__' + yearStr + '-' + monthStr + '-' + dateStr + 'T' +
          closestDate.hour.toString().padStart(2,'0') + ';' +
          closestDate.minute.toString().padStart(2,'0') + ';' +
          closestDate.second.toString().padStart(2,'0') + '.jpg';
      }
      res.status(200).send(JSON.stringify(result)).end();
    });
  });

  /**
   * Save the given bounding box for the given image
   */
  app.post('/api/setBbox', async (req, res) => {
    apiWrapper(req, res, config, 'POST setBbox', async decoded => {
      const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
      assert(isLabeler);
      assert(req.body.fileName && req.body.minX && req.body.minY && req.body.maxX && req.body.maxY);
      assert(typeof(req.body.fileName) === 'string');
      assert(typeof(req.body.notes) === 'string');
      assert(typeof(req.body.minX) === 'number');
      assert(typeof(req.body.minY) === 'number');
      assert(typeof(req.body.maxX) === 'number');
      assert(typeof(req.body.maxY) === 'number');

      const bboxKeys = ['ImageName', 'MinX', 'MinY', 'MaxX', 'MaxY', 'InsertionTime', 'UserID', 'Notes'];
      const bboxVals = [req.body.fileName, req.body.minX, req.body.minY, req.body.maxX, req.body.maxY,
                        Math.floor(new Date().valueOf()/1000), decoded.email, req.body.notes];
      await db.insert('bbox', bboxKeys, bboxVals);

      res.status(200).send('success').end();
    });
  });
}

exports.initApis = initApis;
