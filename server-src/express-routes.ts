/*
# Copyright 2020 Open Climate Tech Contributors
# Licensed under the Apache License, Version 2.0
*/

'use strict';
// Express-only routes that require passport middleware (OAuth flow + local login).
// All other API endpoints live in pages/api/* (see api-handlers.ts).

import { Application, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { OCT_Config } from './oct_types';
import { DbMgr } from './db_mgr';
import * as oct_utils from './oct_utils';
import { getUserId, setJwtCookie } from './api-handlers';

const crypto = require('crypto');
const logger = oct_utils.getLogger('express-routes');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      userID: string;
    }
  }
}

function initPassportAuth(config: OCT_Config, _app: Application, db: DbMgr) {
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
          return cb(null, false, { message: 'Incorrect username or password.' });
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
          function (err: any, hashedPassword: Buffer) {
            if (err) return cb(err);
            if (!crypto.timingSafeEqual(dbHashedPassword, hashedPassword)) {
              logger.error('PassportJS Local Bad password');
              return cb(null, false, { message: 'Incorrect username or password.' });
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
    config.webOauthCallbackURL && config.webOauthClientID && config.webOauthClientSecret;
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
        function (_accessToken, _refreshToken, profile, cb) {
          logger.info('Passport use Google');
          const email =
            (profile && profile.emails && profile.emails.length > 0 && profile.emails[0].value) ||
            '';
          return cb(null, { userID: getUserId('google', email) });
        }
      )
    );
  } else {
    logger.warn('Passport Google strategy not configured');
  }

  const hasFacebookAuthParams =
    config.facebookCallbackURL && config.facebookAppID && config.facebookAppSecret;
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
        function (_accessToken, _refreshToken, profile, cb) {
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

/**
 * Initialize the Express-only routes (passport setup + OAuth + local login).
 */
export function initExpressRoutes(config: OCT_Config, app: Application, db: DbMgr) {
  initPassportAuth(config, app, db);

  app.get('/api/oauthUrl', (req: Request, res: Response, next) => {
    logger.info('GET /api/oauthUrl %s', JSON.stringify(req.query));
    if (typeof req.query.path !== 'string') {
      return res.status(400).send('Bad request').end();
    }
    return passport.authenticate('google', { state: req.query.path })(req, res, next);
  });

  app.get(
    '/oauth2callback',
    passport.authenticate('google', { session: false }),
    function (req: Request, res: Response) {
      logger.info('GET /oauth2callback');
      if (!req.user || !req.user.userID) {
        return res.status(400).send('Bad request').end();
      }
      setJwtCookie(res, config, req.user.userID);
      const qState = req && req.query && req.query.state;
      if (typeof qState !== 'string') {
        return res.status(400).send('Bad request').end();
      }
      res.redirect(qState);
    }
  );

  app.get('/api/oauthFbUrl', (req: Request, res: Response, next) => {
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
    function (req: Request, res: Response) {
      logger.info('GET /oauth2FbCallback');
      if (!req.user || !req.user.userID) {
        return res.status(400).send('Bad request').end();
      }
      setJwtCookie(res, config, req.user.userID);
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
    (req: Request, res: Response) => {
      logger.info('POST /api/loginPassword');
      if (!req.user || !req.user.userID) {
        return res.status(400).send('Bad request').end();
      }
      setJwtCookie(res, config, req.user.userID);
      return res.status(200).send('success').end();
    }
  );

  if (process.env.NODE_ENV === 'development') {
    app.get('/api/oauthDevUrl', (req: Request, res: Response) => {
      logger.info('GET /api/oauthDevUrl %s', JSON.stringify(req.query));
      if (typeof req.query.email !== 'string') {
        return res.status(400).send('Bad request').end();
      }
      setJwtCookie(res, config, getUserId('dev', req.query.email));
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
}
