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

import { assert } from 'chai';
import crypto from 'crypto';
import { Application, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { DbMgr } from './db_mgr';
import { OCT_Config } from './oct_types';
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');

import * as oct_utils from './oct_utils';
const logger = oct_utils.getLogger('api');

const cameraHpwrenRegex = /^[0-9a-z-]+-mobo-c$/;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      userID: string;
    }
  }
}

function getUserId(type: string, username: string) {
  if (type === 'local') {
    return 'Local:' + username;
  } else if (type === 'google') {
    // ideally should have 'Google:' prefix, but for legacy reasons, leaving it untouched
    return username;
  } else if (type === 'dev') {
    return 'Dev:' + username;
  } else if (type === 'facebook') {
    return 'FB:' + username;
  } else {
    throw new Error('getUserId unsupported type: ' + type);
  }
}

function initPassportAuth(config: OCT_Config, app: Application, db: DbMgr) {
  passport.use(
    new LocalStrategy(async function verify(
      username: string,
      password: string,
      cb: any
    ) {
      try {
        logger.info('Passport use local');
        const authQueryRes = await oct_utils.getUserAuth(db, username, 'local');
        if (authQueryRes.length === 0) {
          logger.error('PassportJS Local bad username');
          return cb(null, false, {
            message: 'Incorrect username or password.',
          });
        }
        const dbSaltHex = authQueryRes[0].salt || authQueryRes[0].Salt;
        const dbHashedPasswordHex =
          authQueryRes[0].hashedpassword || authQueryRes[0].HashedPassword;
        const dbSalt = Buffer.from(dbSaltHex, 'hex');
        const dbHashedPassword = Buffer.from(dbHashedPasswordHex, 'hex');
        crypto.pbkdf2(
          password,
          dbSalt,
          310000,
          32,
          'sha256',
          function (err, hashedPassword) {
            if (err) {
              return cb(err);
            }
            if (!crypto.timingSafeEqual(dbHashedPassword, hashedPassword)) {
              logger.error('PassportJS Local Bad password');
              return cb(null, false, {
                message: 'Incorrect username or password.',
              });
            }
            return cb(null, { userID: getUserId('local', username) });
          }
        );
      } catch (err) {
        logger.error('Passport local err', err);
        return cb(err);
      }
    })
  );

  const hasGoogleAuthParams =
    config.webOauthCallbackURL &&
    config.webOauthClientID &&
    config.webOauthClientSecret;
  if (hasGoogleAuthParams || process.env.NODE_ENV !== 'development') {
    const redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3141/oauth2callback'
        : config.webOauthCallbackURL;
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.webOauthClientID,
          clientSecret: config.webOauthClientSecret,
          callbackURL: redirectUrl,
          scope: ['email'],
        },
        function (accessToken, refreshToken, profile, cb) {
          logger.info('Passport use Google');
          const email =
            (profile &&
              profile.emails &&
              profile.emails.length > 0 &&
              profile.emails[0].value) ||
            '';
          return cb(null, { userID: getUserId('google', email) });
        }
      )
    );
  } else {
    logger.warn('Passport Google strategy not configured');
  }

  const hasFacebookAuthParams =
    config.facebookCallbackURL &&
    config.facebookAppID &&
    config.facebookAppSecret;
  if (hasFacebookAuthParams || process.env.NODE_ENV !== 'development') {
    const redirectUrlFB =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3141/oauth2FbCallback'
        : config.facebookCallbackURL;
    passport.use(
      new FacebookStrategy(
        {
          clientID: config.facebookAppID,
          clientSecret: config.facebookAppSecret,
          callbackURL: redirectUrlFB,
        },
        function (accessToken, refreshToken, profile, cb) {
          logger.info('Passport use Facebook');
          const email = profile.id;
          return cb(null, { userID: getUserId('facebook', email) });
        }
      )
    );
  } else {
    logger.warn('Passport Facebook strategy not configured');
  }
}

type OCT_AuthDecoded = {
  email: string;
};

/**
 * Verify that request is signed in
 */
async function apiWrapper(
  req: Request,
  res: Response,
  config: OCT_Config,
  apiDesc: string,
  cb: (decoded: OCT_AuthDecoded) => void
) {
  logger.info(apiDesc);
  let decoded;
  try {
    decoded = await oct_utils.checkAuth(req, config);
    await cb(decoded);
  } catch (err) {
    logger.error('%s failure: %s', apiDesc, err);
    res.status(401).send('Unauthorized').end();
  }
}

/**
 * Initialize all the API routes
 */
export function initApis(config: OCT_Config, app: Application, db: DbMgr) {
  initPassportAuth(config, app, db);

  // This route is just a stub for testing.
  app.get('/api/testGet', async (req: Request, res: Response) => {
    logger.info('GET testGet');
    res.status(200).send('Hello, m24.1610 world!').end();
  });

  app.post('/api/testPost', async (req, res) => {
    logger.info('POST testPost');
    res.status(200).send('success').end();
  });

  app.get('/api/checkAuth', async (req, res) => {
    apiWrapper(req, res, config, 'GET checkAuth', () => {
      res.status(200).send('success').end();
    });
  });

  function genJwtCookie(res: Response, userId: string) {
    const expirationDays = 30; // 1 month
    const expirationMS = expirationDays * 24 * 60 * 60 * 1000;
    const expiration = expirationDays.toString() + 'd';
    const signed = jwt.sign({ email: userId }, config.cookieJwtSecret, {
      expiresIn: expiration,
    });
    console.log('genJwtCookie auth token', JSON.stringify(signed));

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      path: '/',
      maxAge: expirationMS,
      expires: new Date(new Date().getTime() + expirationMS),
    };
    if (process.env.NODE_ENV !== 'development') {
      cookieOptions.secure = true;
    }
    console.log('genJwtCookie cookie opts', JSON.stringify(cookieOptions));
    res.cookie('cf_token', signed, cookieOptions);
  }

  app.get('/api/oauthUrl', (req, res, next) => {
    logger.info('GET /api/oauthUrl %s', JSON.stringify(req.query));
    if (typeof req.query.path !== 'string') {
      return res.status(400).send('Bad request').end();
    }
    return passport.authenticate('google', {
      state: req.query.path,
    })(req, res, next);
  });

  app.get(
    '/oauth2callback',
    passport.authenticate('google', { session: false }),
    function (req, res) {
      logger.info('GET /oauth2callback');
      if (!req.user || !req.user.userID) {
        return res.status(400).send('Bad request').end();
      }
      genJwtCookie(res, req.user.userID);
      // send client browser to desired URL specified in state by leveraging react redirect in client JS
      const qState = req && req.query && req.query.state;
      if (typeof qState !== 'string') {
        return res.status(400).send('Bad request').end();
      }
      res.redirect(qState);
    }
  );

  app.get('/api/oauthFbUrl', (req, res, next) => {
    logger.info('GET /api/oauthFbUrl %s', JSON.stringify(req.query));
    if (typeof req.query.path !== 'string') {
      return res.status(400).send('Bad request').end();
    }
    return passport.authenticate('facebook', {
      scope: ['email', 'public_profile'],
      state: req.query.path,
    })(req, res, next);
  });

  app.get(
    '/oauth2FbCallback',
    passport.authenticate('facebook', { session: false }),
    function (req, res) {
      logger.info('GET /oauth2FbCallback');
      if (!req.user || !req.user.userID) {
        return res.status(400).send('Bad request').end();
      }
      genJwtCookie(res, req.user.userID);
      // send client browser to desired URL specified in state by leveraging react redirect in client JS
      const qState = req && req.query && req.query.state;
      if (typeof qState !== 'string') {
        return res.status(400).send('Bad request').end();
      }
      res.redirect(qState);
    }
  );

  app.post(
    '/api/loginPassword',
    passport.authenticate('local', { session: false }),
    (req, res) => {
      logger.info('POST /api/loginPassword');
      if (!req.user || !req.user.userID) {
        return res.status(400).send('Bad request').end();
      }
      genJwtCookie(res, req.user.userID);
      return res.status(200).send('success').end();
    }
  );

  app.post('/api/register', async function (req, res, next) {
    try {
      logger.info('POST /api/register');
      // check for existing account for given user
      const authQueryRes = await oct_utils.getUserAuth(
        db,
        req.body.username,
        'local'
      );
      if (authQueryRes.length !== 0) {
        logger.error(
          'POST Register err',
          new Error(`username exists: ${req.body.username}`)
        );
        return res.status(409).send('Conflict').end();
      }
      // create new user+salt+password entry in DB
      const salt = crypto.randomBytes(16);
      crypto.pbkdf2(
        req.body.password,
        salt,
        310000,
        32,
        'sha256',
        async function (err, hashedPassword) {
          if (err) {
            return next(err);
          }
          const saltHex = salt.toString('hex');
          const passwordHex = hashedPassword.toString('hex');
          await db.insert(
            'auth',
            ['userid, type, hashedpassword, salt, email'],
            [req.body.username, 'local', passwordHex, saltHex, req.body.email]
          );
          // login
          genJwtCookie(res, getUserId('local', req.body.username));
          res.status(200).send('success').end();
        }
      );
    } catch (err) {
      logger.error('POST Register err', err);
      res.status(500).send('Internal Server Error').end();
    }
  });

  if (process.env.NODE_ENV === 'development') {
    // For easier testing, this endpoint simulates an OAuth flow by creating a valid JWT and redirecting
    app.get('/api/oauthDevUrl', (req, res) => {
      logger.info('GET /api/oauthDevUrl %s', JSON.stringify(req.query));
      if (typeof req.query.email !== 'string') {
        return res.status(400).send('Bad request').end();
      }
      genJwtCookie(res, getUserId('dev', req.query.email));
      // send client browser to desired URL specified in state by leveraging react redirect in client JS
      const {
        query: { host, path, protocol },
      } = req;
      if (
        typeof protocol !== 'string' ||
        typeof host !== 'string' ||
        typeof path !== 'string'
      ) {
        return res.status(400).send('Bad request').end();
      }
      const url = oct_utils.getClientUrl(protocol, host, path);
      res.redirect(url);
    });
  }

  app.get('/api/logout', function (req, res, next) {
    res.clearCookie('cf_token');
    return res.status(200).send('success').end();
  });

  app.post('/api/voteFire', async (req, res) => {
    apiWrapper(req, res, config, 'POST voteFire', async (decoded) => {
      assert(
        req.body.cameraID &&
          req.body.timestamp &&
          req.body.isRealFire !== undefined
      );

      // cameraID validation
      assert(typeof req.body.cameraID === 'string');

      // timestamp validation
      assert(typeof req.body.timestamp === 'number');
      assert(req.body.timestamp > 1510001000); // Nov 2017
      assert(req.body.timestamp < new Date().valueOf() / 1000);

      assert(typeof req.body.isRealFire === 'boolean');

      // validate given info matches an detection
      const detectionsQuery = `select * from detections where timestamp=${req.body.timestamp} and cameraname='${req.body.cameraID}'`;
      const matchingDetections = await db.query(detectionsQuery);
      assert(matchingDetections.length > 0);

      const queryKeys = ['cameraname', 'timestamp', 'userid'];
      const queryValues = [
        req.body.cameraID,
        req.body.timestamp,
        decoded.email,
      ];
      await db.insertOrUpdate(
        'votes',
        ['isrealfire'],
        [req.body.isRealFire ? 1 : 0],
        queryKeys,
        queryValues
      );
      res.status(200).send('success').end();
    });
  });

  app.post('/api/undoVoteFire', async (req, res) => {
    apiWrapper(req, res, config, 'POST undoVoteFire', async (decoded) => {
      assert(req.body.cameraID && req.body.timestamp);

      // cameraID validation
      assert(typeof req.body.cameraID === 'string');

      // timestamp validation
      assert(typeof req.body.timestamp === 'number');
      assert(req.body.timestamp > 1510001000); // Nov 2017
      assert(req.body.timestamp < new Date().valueOf() / 1000);

      const existingVotesByUser = await oct_utils.getUserVotes(
        db,
        req.body.cameraID,
        req.body.timestamp,
        decoded.email
      );
      // console.log('voteFire existingVotesByUser %s', JSON.stringify(existingVotesByUser));
      if (!existingVotesByUser || existingVotesByUser.length === 0) {
        logger.warn('No votes to undo %s', existingVotesByUser);
        res.status(400).send('Bad Request').end();
        return;
      }
      const sqlStr = `delete from votes where cameraname='${req.body.cameraID}' and timestamp=${req.body.timestamp} and userid='${decoded.email}'`;
      await db.query(sqlStr);
      res.status(200).send('success').end();
    });
  });

  /**
   * Return user preferences saved by the user
   * 1. the geographical region on interest (if any)
   * 2. webNotify
   */
  app.get('/api/getPreferences', async (req, res) => {
    apiWrapper(req, res, config, 'GET getPreferences', async (decoded) => {
      const preferences = await oct_utils.getUserPreferences(db, decoded.email);
      console.log('getPreferences existing %s', JSON.stringify(preferences));
      const result = {
        region: preferences.region,
        webNotify: preferences.webNotify,
        showProto: preferences.showProto,
      };
      res.status(200).send(result).end();
    });
  });

  /**
   * Save the given geographical region for future reference for current user.
   */
  app.post('/api/setRegion', async (req, res) => {
    apiWrapper(req, res, config, 'POST setRegion', async (decoded) => {
      assert(typeof req.body.topLat === 'number');
      assert(typeof req.body.leftLong === 'number');
      assert(typeof req.body.bottomLat === 'number');
      assert(typeof req.body.rightLong === 'number');

      const regionKeys = ['toplat', 'leftlong', 'bottomlat', 'rightlong'];
      const regionVals = [
        req.body.topLat,
        req.body.leftLong,
        req.body.bottomLat,
        req.body.rightLong,
      ];
      await db.insertOrUpdate(
        'user_preferences',
        regionKeys,
        regionVals,
        ['userid'],
        [decoded.email]
      );
      res.status(200).send('success').end();
    });
  });

  /**
   * Save user preference on whether they want to HTML5 notifications
   */
  app.post('/api/setWebNotify', async (req, res) => {
    apiWrapper(req, res, config, 'POST setWebNotify', async (decoded) => {
      assert(typeof req.body.webNotify === 'boolean');
      assert(req.body.webNotify === true || req.body.webNotify === false);

      await db.insertOrUpdate(
        'user_preferences',
        ['webnotify'],
        [req.body.webNotify ? 1 : 0],
        ['userid'],
        [decoded.email]
      );
      res.status(200).send('success').end();
    });
  });

  /**
   * Get a list of recently fires with majority positive votes along with voting stats
   */
  app.get('/api/confirmedFires', async (req, res) => {
    logger.info('GET confirmedFires');
    let decoded;
    try {
      decoded = await oct_utils.checkAuth(req, config);
    } catch (err) {
      // ignore
    }
    let showProto = false;
    if (decoded && decoded.email) {
      const prefs = await oct_utils.getUserPreferences(db, decoded.email);
      showProto = prefs.showProto;
    }
    const nowSeconds = Math.round(new Date().valueOf() / 1000);
    const minTimestamp = nowSeconds - 3600 * 24 * 30; // check last 30 days
    let sqlStr = `select * from
                      (select * from
                        (select cameraname,timestamp,avg(isrealfire) as avgrf,count(*) as ct from votes
                          where timestamp > ${minTimestamp} group by cameraname,timestamp) as q0
                        where avgrf > 0.49 order by timestamp desc limit 100) as vt
                      join detections
                        on vt.cameraname=detections.cameraname and vt.timestamp=detections.timestamp`;
    if (!showProto) {
      sqlStr += ' where detections.isproto != 1 ';
    }
    sqlStr += ' order by detections.sortId desc, vt.timestamp desc limit 20';
    const dbRes = await db.query(sqlStr);
    const fireEvents = await Promise.all(
      dbRes.map(async (dbEntry: Record<string, any>) => {
        const fireEvent = oct_utils.dbAlertToUiObj(dbEntry);
        fireEvent.avgVote = dbEntry.avgrf;
        fireEvent.numVotes = dbEntry.ct;
        return await oct_utils.augmentCameraInfo(db, config, fireEvent);
      })
    );
    res.status(200).send(fireEvents).end();
  });

  /**
   * Get a list of selected fires
   */
  app.get('/api/selectedFires', async (req, res) => {
    logger.info('GET selectedFires');
    let fireName = 'comet';

    if (req.query.fireName && typeof req.query.fireName === 'string') {
      fireName = req.query.fireName;
    }
    const sqlStr = `select * from
                      (select nf.cameraname as cameraname, nf.timestamp as timestamp, avg(isrealfire) as avgrf, count(*) as ct from
                        (select * from named_fires where firename='${fireName}' order by timestamp desc limit 20) as nf
                        join votes
                          on nf.cameraname=votes.cameraname and nf.timestamp=votes.timestamp group by nf.cameraname,nf.timestamp) as nfv
                      join detections
                        on nfv.cameraname=detections.cameraname and nfv.timestamp=detections.timestamp
                      order by detections.sortId desc, nfv.timestamp desc`;
    const dbRes = await db.query(sqlStr);
    const fireEvents = await Promise.all(
      dbRes.map(async (dbEntry: Record<string, any>) => {
        const fireEvent = oct_utils.dbAlertToUiObj(dbEntry);
        fireEvent.avgVote = dbEntry.avgrf;
        fireEvent.numVotes = dbEntry.ct;
        return await oct_utils.augmentCameraInfo(db, config, fireEvent);
      })
    );
    res.status(200).send(fireEvents).end();
  });

  /**
   * Get a list of detected fires
   */
  app.get('/api/detectedFires', async (req, res) => {
    apiWrapper(req, res, config, 'GET detectedFires', async (decoded) => {
      const preferences = await oct_utils.getUserPreferences(db, decoded.email);
      assert(preferences.showProto);

      const sqlStr = `select detections.*
                        from detections left join alerts on detections.timestamp=alerts.timestamp and detections.cameraname=alerts.cameraname
                        where alerts.timestamp is null and detections.CroppedID != ''
                        order by detections.sortId desc, detections.timestamp desc limit 20;`;
      const dbRes = await db.query(sqlStr);
      const fireEvents = await Promise.all(
        dbRes.map(async (dbEntry: Record<string, any>) => {
          const fireEvent = oct_utils.dbAlertToUiObj(dbEntry);
          fireEvent.avgVote = dbEntry.avgrf;
          fireEvent.numVotes = dbEntry.ct;
          await oct_utils.augmentCameraInfo(db, config, fireEvent);
          return await oct_utils.augmentVotes(db, fireEvent, decoded.email);
        })
      );
      res.status(200).send(fireEvents).end();
    });
  });

  /**
   * Return list of available cameras
   */
  app.get('/api/listCameras', async (req, res) => {
    apiWrapper(req, res, config, 'GET listCameras', async (decoded) => {
      const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
      assert(isLabeler);
      const sqlStr = 'select name from sources order by name';
      const dbRes = await db.query(sqlStr);
      const cameraIDs = dbRes.map(
        (dbEntry: Record<string, any>) => dbEntry.name
      );
      res.status(200).send(cameraIDs).end();
    });
  });

  /**
   * Return list of monitored "production" cameras
   */
  app.get('/api/monitoredCameras', async (req, res) => {
    logger.info('GET monitoredCameras');
    const prodTypesCheck = config.prodTypes
      .split(',')
      .map((x) => `type='${x}'`)
      .join(' or ');
    const sqlStr = `select latitude, longitude from cameras where locationid in
                     (select locationid from sources where dormant = 0 and (${prodTypesCheck}))`;
    const dbRes = await db.query(sqlStr);
    const monitoredCameras = dbRes.map((dbEntry: Record<string, any>) => ({
      latitude: dbEntry['latitude'] || dbEntry['Latitude'],
      longitude: dbEntry['longitude'] || dbEntry['Longitude'],
    }));
    res.status(200).send(monitoredCameras).end();
  });

  /**
   * Get URL for image from given camera at given time.
   * This code could work directly from the client, except browser CORS restrictions prevent fetching image archives
   */
  app.get('/api/fetchImage', async (req, res) => {
    /***
     * Parse out timestamps from HTTP directory listing of HPWREN archive "Q" directory
     */
    function parseTimeFiles(text: string) {
      const timeFileRegex = /href="(1\d{9})\.jpg"/g;
      const list = [];
      let entry;
      // eslint-disable-next-line
      while ((entry = timeFileRegex.exec(text))) {
        list.push(parseInt(entry[1]));
      }
      return list;
    }

    /**
     * Get the timestamps of files in given URL of HPWREN archive directory
     */
    async function getTimeFiles(hpwrenUrlDir: string) {
      const resp = await fetch(hpwrenUrlDir);
      const dirText = await resp.text();
      return parseTimeFiles(dirText);
    }

    apiWrapper(req, res, config, 'GET fetchImage', async (decoded) => {
      const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
      assert(isLabeler);
      if (typeof req.query.cameraID !== 'string') {
        return res.status(400).send('Bad request').end();
      }
      assert(cameraHpwrenRegex.test(req.query.cameraID));
      const dateTime = DateTime.fromISO(req.query.dateTime).setZone(
        config.timeZone
      );
      assert(dateTime.isValid);
      assert(
        req.query.direction === 'positive' ||
          req.query.direction === 'negative' ||
          req.query.direction === ''
      );
      const yearStr = dateTime.year.toString();
      const monthStr = dateTime.month.toString().padStart(2, '0');
      const dateStr = dateTime.day.toString().padStart(2, '0');
      const fullDate = yearStr + monthStr + dateStr;
      const qStr = 'Q' + Math.floor(dateTime.hour / 3 + 1);
      let hpwrenUrlDir = `http://c1.hpwren.ucsd.edu/archive/${req.query.cameraID}/large/${yearStr}/${fullDate}/${qStr}/`;
      logger.info('fetchImage hpwrenUrlDir %s', hpwrenUrlDir);
      let timeFiles = await getTimeFiles(hpwrenUrlDir);
      if (!timeFiles.length) {
        // retry without year directory
        hpwrenUrlDir = `http://c1.hpwren.ucsd.edu/archive/${req.query.cameraID}/large/${fullDate}/${qStr}/`;
        logger.info('fetchImage retry hpwrenUrlDir %s', hpwrenUrlDir);
        timeFiles = await getTimeFiles(hpwrenUrlDir);
      }
      const result: any = {};
      if (timeFiles.length) {
        const closest = oct_utils.findClosest(
          timeFiles,
          Math.round(dateTime.valueOf() / 1000),
          req.query.direction
        );
        const closestDate = DateTime.fromSeconds(closest).setZone(
          config.timeZone
        );
        const imageUrl = hpwrenUrlDir + closest + '.jpg';
        logger.info('fetchImage imageUrl %s', imageUrl);
        result.imageUrl = imageUrl;
        result.imageTime = closestDate.toUTC().toISO();
        result.imageName =
          req.query.cameraID +
          '__' +
          yearStr +
          '-' +
          monthStr +
          '-' +
          dateStr +
          'T' +
          closestDate.hour.toString().padStart(2, '0') +
          ';' +
          closestDate.minute.toString().padStart(2, '0') +
          ';' +
          closestDate.second.toString().padStart(2, '0') +
          '.jpg';
      }
      res.status(200).send(JSON.stringify(result)).end();
    });
  });

  /**
   * Save the given bounding box for the given image
   */
  app.post('/api/setBbox', async (req, res) => {
    apiWrapper(req, res, config, 'POST setBbox', async (decoded) => {
      const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
      assert(isLabeler);
      assert(
        req.body.fileName &&
          req.body.minX &&
          req.body.minY &&
          req.body.maxX &&
          req.body.maxY
      );
      assert(typeof req.body.fileName === 'string');
      assert(typeof req.body.notes === 'string');
      assert(typeof req.body.minX === 'number');
      assert(typeof req.body.minY === 'number');
      assert(typeof req.body.maxX === 'number');
      assert(typeof req.body.maxY === 'number');

      const bboxKeys = [
        'ImageName',
        'MinX',
        'MinY',
        'MaxX',
        'MaxY',
        'InsertionTime',
        'UserID',
        'Notes',
      ];
      const bboxVals = [
        req.body.fileName,
        req.body.minX,
        req.body.minY,
        req.body.maxX,
        req.body.maxY,
        Math.floor(new Date().valueOf() / 1000),
        decoded.email,
        req.body.notes,
      ];
      await db.insert('bbox', bboxKeys, bboxVals);

      res.status(200).send('success').end();
    });
  });

  /**
   * Get a list of active RX/permitted Burns
   */
  app.get('/api/activeRxBurns', async (req, res) => {
    logger.info('GET activeRxBurns');
    const sourceActive = 'Active';
    const sqlStr = `select info from rx_burns where source = '${sourceActive}' order by timestamp desc limit 1`;
    const dbRes = await db.query(sqlStr);
    if (dbRes && dbRes.length === 1) {
      const info = dbRes[0].Info || dbRes[0].info;
      const activeBurnLocations = JSON.parse(info);
      res.status(200).send(activeBurnLocations).end();
    } else {
      res.status(200).send([]).end();
    }
  });
}
