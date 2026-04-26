/*
# Copyright 2020 Open Climate Tech Contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
*/

'use strict';
// API handler functions usable from both Express routes and Next.js pages/api routes.
// Each exported handler is a thin async function that uses the shared singletons
// from services.ts (db, config) and writes responses using the standard
// `req`/`res` API (compatible with both Express and Next.js).

import { assert } from 'chai';
import { Request, Response } from 'express';

import { OCT_Config } from './oct_types';
import { DbMgr } from './db_mgr';
import * as oct_utils from './oct_utils';

const fetch = require('node-fetch');
const { DateTime } = require('luxon');
const jwt = require('jsonwebtoken');

const logger = oct_utils.getLogger('api-handlers');
const cameraHpwrenRegex = /^[0-9a-z-]+-mobo-c$/;

type OCT_AuthDecoded = {
  email: string;
};

export function getUserId(type: string, username: string) {
  if (type === 'local') return 'Local:' + username;
  if (type === 'google') return username; // legacy: no prefix
  if (type === 'dev') return 'Dev:' + username;
  if (type === 'facebook') return 'FB:' + username;
  throw new Error('getUserId unsupported type: ' + type);
}

/**
 * Set a signed JWT auth cookie. Works for both Express and Next.js because it
 * uses the raw `Set-Cookie` header rather than Express-only `res.cookie()`.
 */
export function setJwtCookie(res: Response, config: OCT_Config, userId: string) {
  const expirationDays = 30;
  const expirationMS = expirationDays * 24 * 60 * 60 * 1000;
  const expiration = expirationDays.toString() + 'd';
  const signed = jwt.sign({ email: userId }, config.cookieJwtSecret, {
    expiresIn: expiration,
  });
  const expires = new Date(new Date().getTime() + expirationMS).toUTCString();
  const secure = process.env.NODE_ENV !== 'development';
  const cookieStr =
    `cf_token=${signed}; Path=/; HttpOnly; Max-Age=${expirationMS / 1000};` +
    ` Expires=${expires}` +
    (secure ? '; Secure' : '');
  res.setHeader('Set-Cookie', cookieStr);
}

/**
 * Verify the request has a valid JWT cookie; calls `cb(decoded)` on success
 * or returns 401 on failure.
 */
async function apiWrapper(
  req: Request,
  res: Response,
  config: OCT_Config,
  apiDesc: string,
  cb: (decoded: OCT_AuthDecoded) => Promise<void> | void
) {
  logger.info(apiDesc);
  try {
    const decoded = await oct_utils.checkAuth(req, config);
    await cb(decoded);
  } catch (err) {
    logger.error('%s failure: %s', apiDesc, err);
    res.status(401).send('Unauthorized');
  }
}

// =============================================================================
// Public API handlers (no auth required for some)
// =============================================================================

export async function testGetHandler(_db: DbMgr, _config: OCT_Config, _req: Request, res: Response) {
  logger.info('GET testGet');
  res.status(200).send('Hello, m24.1610 world!');
}

export async function testPostHandler(_db: DbMgr, _config: OCT_Config, _req: Request, res: Response) {
  logger.info('POST testPost');
  res.status(200).send('success');
}

export async function checkAuthHandler(_db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'GET checkAuth', () => {
    res.status(200).send('success');
  });
}

export async function logoutHandler(_db: DbMgr, _config: OCT_Config, _req: Request, res: Response) {
  res.setHeader(
    'Set-Cookie',
    'cf_token=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  res.status(200).send('success');
}

export async function registerHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  try {
    logger.info('POST /api/register');
    const authQueryRes = await oct_utils.getUserAuth(db, req.body.username, 'local');
    if (authQueryRes.length !== 0) {
      logger.error('POST Register err', new Error(`username exists: ${req.body.username}`));
      return res.status(409).send('Conflict');
    }
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(
      req.body.password,
      salt,
      310000,
      32,
      'sha256',
      async function (err: any, hashedPassword: Buffer) {
        if (err) {
          res.status(500).send('Internal Server Error');
          return;
        }
        const saltHex = salt.toString('hex');
        const passwordHex = hashedPassword.toString('hex');
        await db.insert(
          'auth',
          ['userid, type, hashedpassword, salt, email'],
          [req.body.username, 'local', passwordHex, saltHex, req.body.email]
        );
        setJwtCookie(res, config, getUserId('local', req.body.username));
        res.status(200).send('success');
      }
    );
  } catch (err) {
    logger.error('POST Register err', err);
    res.status(500).send('Internal Server Error');
  }
}

export async function voteFireHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'POST voteFire', async (decoded) => {
    assert(req.body.cameraID && req.body.timestamp && req.body.isRealFire !== undefined);
    assert(typeof req.body.cameraID === 'string');
    assert(typeof req.body.timestamp === 'number');
    assert(req.body.timestamp > 1510001000);
    assert(req.body.timestamp < new Date().valueOf() / 1000);
    assert(typeof req.body.isRealFire === 'boolean');

    const detectionsQuery = `select * from detections where timestamp=${req.body.timestamp} and cameraname='${req.body.cameraID}'`;
    const matchingDetections = await db.query(detectionsQuery);
    assert(matchingDetections.length > 0);

    const queryKeys = ['cameraname', 'timestamp', 'userid'];
    const queryValues = [req.body.cameraID, req.body.timestamp, decoded.email];
    await db.insertOrUpdate(
      'votes',
      ['isrealfire'],
      [req.body.isRealFire ? 1 : 0],
      queryKeys,
      queryValues
    );
    res.status(200).send('success');
  });
}

export async function undoVoteFireHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'POST undoVoteFire', async (decoded) => {
    assert(req.body.cameraID && req.body.timestamp);
    assert(typeof req.body.cameraID === 'string');
    assert(typeof req.body.timestamp === 'number');
    assert(req.body.timestamp > 1510001000);
    assert(req.body.timestamp < new Date().valueOf() / 1000);

    const existingVotesByUser = await oct_utils.getUserVotes(
      db,
      req.body.cameraID,
      req.body.timestamp,
      decoded.email
    );
    if (!existingVotesByUser || existingVotesByUser.length === 0) {
      logger.warn('No votes to undo %s', existingVotesByUser);
      res.status(400).send('Bad Request');
      return;
    }
    const sqlStr = `delete from votes where cameraname='${req.body.cameraID}' and timestamp=${req.body.timestamp} and userid='${decoded.email}'`;
    await db.query(sqlStr);
    res.status(200).send('success');
  });
}

export async function getPreferencesHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'GET getPreferences', async (decoded) => {
    const preferences = await oct_utils.getUserPreferences(db, decoded.email);
    const result = {
      region: preferences.region,
      webNotify: preferences.webNotify,
      showProto: preferences.showProto,
    };
    res.status(200).send(result);
  });
}

export async function setRegionHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'POST setRegion', async (decoded) => {
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
    res.status(200).send('success');
  });
}

export async function setWebNotifyHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'POST setWebNotify', async (decoded) => {
    assert(typeof req.body.webNotify === 'boolean');
    await db.insertOrUpdate(
      'user_preferences',
      ['webnotify'],
      [req.body.webNotify ? 1 : 0],
      ['userid'],
      [decoded.email]
    );
    res.status(200).send('success');
  });
}

export async function confirmedFiresHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  logger.info('GET confirmedFires');
  let decoded: OCT_AuthDecoded | undefined;
  try {
    decoded = await oct_utils.checkAuth(req, config);
  } catch {
    /* anonymous OK */
  }
  let showProto = false;
  if (decoded && decoded.email) {
    const prefs = await oct_utils.getUserPreferences(db, decoded.email);
    showProto = prefs.showProto;
  }
  const nowSeconds = Math.round(new Date().valueOf() / 1000);
  const minTimestamp = nowSeconds - 3600 * 24 * 30;
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
  res.status(200).send(fireEvents);
}

export async function selectedFiresHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
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
  res.status(200).send(fireEvents);
}

export async function detectedFiresHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'GET detectedFires', async (decoded) => {
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
    res.status(200).send(fireEvents);
  });
}

export async function listCamerasHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'GET listCameras', async (decoded) => {
    const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
    assert(isLabeler);
    const sqlStr = 'select name from sources order by name';
    const dbRes = await db.query(sqlStr);
    const cameraIDs = dbRes.map((dbEntry: Record<string, any>) => dbEntry.name);
    res.status(200).send(cameraIDs);
  });
}

export async function monitoredCamerasHandler(db: DbMgr, config: OCT_Config, _req: Request, res: Response) {
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
  res.status(200).send(monitoredCameras);
}

export async function fetchImageHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  function parseTimeFiles(text: string) {
    const timeFileRegex = /href="(1\d{9})\.jpg"/g;
    const list: number[] = [];
    let entry;
    // eslint-disable-next-line no-cond-assign
    while ((entry = timeFileRegex.exec(text))) {
      list.push(parseInt(entry[1]));
    }
    return list;
  }
  async function getTimeFiles(hpwrenUrlDir: string) {
    const resp = await fetch(hpwrenUrlDir);
    const dirText = await resp.text();
    return parseTimeFiles(dirText);
  }
  await apiWrapper(req, res, config, 'GET fetchImage', async (decoded) => {
    const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
    assert(isLabeler);
    if (typeof req.query.cameraID !== 'string') {
      res.status(400).send('Bad request');
      return;
    }
    assert(cameraHpwrenRegex.test(req.query.cameraID));
    const dateTime = DateTime.fromISO(req.query.dateTime).setZone(config.timeZone);
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
      const closestDate = DateTime.fromSeconds(closest).setZone(config.timeZone);
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
    res.status(200).send(JSON.stringify(result));
  });
}

export async function setBboxHandler(db: DbMgr, config: OCT_Config, req: Request, res: Response) {
  await apiWrapper(req, res, config, 'POST setBbox', async (decoded) => {
    const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
    assert(isLabeler);
    assert(
      req.body.fileName && req.body.minX && req.body.minY && req.body.maxX && req.body.maxY
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
    res.status(200).send('success');
  });
}

export async function activeRxBurnsHandler(db: DbMgr, _config: OCT_Config, _req: Request, res: Response) {
  logger.info('GET activeRxBurns');
  const sourceActive = 'Active';
  const sqlStr = `select info from rx_burns where source = '${sourceActive}' order by timestamp desc limit 1`;
  const dbRes = await db.query(sqlStr);
  if (dbRes && dbRes.length === 1) {
    const info = dbRes[0].Info || dbRes[0].info;
    const activeBurnLocations = JSON.parse(info);
    res.status(200).send(activeBurnLocations);
  } else {
    res.status(200).send([]);
  }
}
