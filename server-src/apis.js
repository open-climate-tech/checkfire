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
const { sql } = require('googleapis/build/src/apis/sql');

const scopes = [
  'email',
  // 'profile'
];

/**
 * Verify that request has a valid signed JWT cookie
 * @param {*} req
 * @param {*} res
 * @param {*} config
 */
async function verifyAuth(req, res, config) {
  try {
    return await oct_utils.checkAuth(req, config);
  } catch (err) {
    console.log('jwt verify err', err);
    res.status(403).send('Forbidden').end();
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

  app.post('/api/voteFire', async (req, res) => {
    logger.info('POST voteFire');
    let decoded;
    try {
      decoded = await verifyAuth(req, res, config);
      assert(req.body.cameraID && req.body.timestamp && (req.body.isRealFire !== undefined));

      // cameraID validation
      assert(typeof(req.body.cameraID) === 'string');
      const cameraRegex = /^[0-9a-z\-]+\-mobo-c$/;
      assert(cameraRegex.test(req.body.cameraID));

      // timestamp validation
      assert(typeof(req.body.timestamp) === 'number');
      assert(req.body.timestamp > 1510001000); // Nov 2017
      assert(req.body.timestamp < new Date().valueOf()/1000);

      assert(typeof(req.body.isRealFire) === 'boolean');
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
    } catch (err) {
      logger.error('voteFire failures', err);
      if (decoded) {
        res.status(400).send('Bad Request').end();
      }
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

  /**
   * Return the geographical region on interest (if any) saved by the user
   */
  app.get('/api/getRegion', async (req, res) => {
    logger.info('GET getRegion');
    let decoded;
    try {
      decoded = await verifyAuth(req, res, config);

      const userRegion = await oct_utils.getUserRegion(db, decoded.email);
      console.log('getRegion existing %s', JSON.stringify(userRegion));
      res.status(200).send(userRegion).end();
    } catch (err) {
      logger.error('getRegion failures', err);
      if (decoded) {
        res.status(400).send('Bad Request').end();
      }
    }
  });

  /**
   * Save the given geographical region for future reference for current user.
   * If top/left/bottom/right are all 1, that indicates special value to delete the region.
   */
  app.post('/api/setRegion', async (req, res) => {
    logger.info('POST setRegion');
    let decoded;
    try {
      decoded = await verifyAuth(req, res, config);
      assert(req.body.topLat && req.body.leftLong && req.body.bottomLat && req.body.rightLong);
      assert(typeof(req.body.topLat) === 'number');
      assert(typeof(req.body.leftLong) === 'number');
      assert(typeof(req.body.bottomLat) === 'number');
      assert(typeof(req.body.rightLong) === 'number');

      const userRegion = await oct_utils.getUserRegion(db, decoded.email);
      console.log('setRegion existing %s', JSON.stringify(userRegion));

      let sqlStr;
      if ((req.body.topLat === 1) && (req.body.leftLong === 1) && (req.body.bottomLat === 1) && (req.body.rightLong === 1)) {
        sqlStr = `delete from user_preferences where userid='${decoded.email}'`;
      } else if (userRegion && userRegion.topLat) {
        sqlStr = `update user_preferences set toplat=${req.body.topLat}, leftlong=${req.body.leftLong},
          bottomlat=${req.body.bottomLat}, rightlong=${req.body.rightLong}
          where userid='${decoded.email}'`;
      } else {
        sqlStr = `insert into user_preferences (userid, toplat, leftlong, bottomlat, rightlong) values
          ('${decoded.email}',${req.body.topLat}, ${req.body.leftLong}, ${req.body.bottomLat}, ${req.body.rightLong})`;
      }
      await db.query(sqlStr);
      res.status(200).send('success').end();
    } catch (err) {
      logger.error('setRegion failures', err);
      if (decoded) {
        res.status(400).send('Bad Request').end();
      }
    }
  });

}

exports.initApis = initApis;
