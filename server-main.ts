/*
# Copyright 2020 Open Climate Tech Contributors
# Licensed under the Apache License, Version 2.0
*/

'use strict';
// Custom Next.js + Express server.
//
// Express handles middleware (helmet, cookies, body parsing) and the routes that
// require Express-specific features (passport OAuth, SSE). Everything else
// (pages, pages/api/*, static assets) is handled by the Next.js request handler.
/* eslint quotes: 0 */

import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import path from 'path';
import next from 'next';

const cookieParser = require('cookie-parser');
const oct_utils = require('./server-src/oct_utils');
import * as services from './server-src/services';

const logger = oct_utils.getLogger('main');
require('source-map-support').install();

const dev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT || '3141', 10);
// Next.js needs the project root (where .next/ and pages/ live). When this
// file is compiled to dist/, __dirname points to dist/, so use cwd instead
// (npm start / npm run dev both run from project root).
const projRootDir = process.cwd();

const nextApp = next({ dev, dir: projRootDir });
const nextHandler = nextApp.getRequestHandler();

async function main() {
  await nextApp.prepare();

  const app = express();

  // ---------------------------------------------------------------------------
  // Logging + dev CORS
  // ---------------------------------------------------------------------------
  app.use(function (req: Request, res: Response, next: NextFunction) {
    const headers = Object.assign({}, req.headers);
    headers.url = req.originalUrl || req.url;
    logger.info('request Headers: %s', JSON.stringify(headers));
    if (process.env.NODE_ENV === 'development') {
      if (req.header('origin')) {
        res.setHeader('Access-Control-Allow-Origin', req.header('origin') || '');
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'origin, content-type, accept');
    }
    next();
  });

  // ---------------------------------------------------------------------------
  // Security headers (CSP relaxed in dev for Next.js HMR)
  // ---------------------------------------------------------------------------
  app.use(helmet());
  const trusted = ["'self'"];
  if (process.env.NODE_ENV === 'development') {
    trusted.push('http://localhost:*');
  }
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: trusted,
        scriptSrc: [
          "'unsafe-inline'",
          "'unsafe-eval'", // required by Next.js dev mode
          'https://www.googletagmanager.com',
          '*.googletagmanager.com',
          'unpkg.com',
        ].concat(trusted),
        styleSrc: [
          "'unsafe-inline'",
          '*.w3schools.com',
          'cdnjs.cloudflare.com',
          'unpkg.com',
        ].concat(trusted),
        imgSrc: [
          'data:',
          'blob:',
          'www.googletagmanager.com',
          'storage.googleapis.com',
          '*.openstreetmap.org',
        ].concat(trusted),
        mediaSrc: ['storage.googleapis.com'].concat(trusted),
        connectSrc: ['www.google-analytics.com'].concat(trusted),
      },
    })
  );
  app.use(helmet.crossOriginEmbedderPolicy({ policy: 'credentialless' }));

  // ---------------------------------------------------------------------------
  // Body / cookies / https redirect
  // ---------------------------------------------------------------------------
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use(function (req: Request, res: Response, next: NextFunction) {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    next();
  });

  // ---------------------------------------------------------------------------
  // Static webroot pages (terms.html, privacy.html, disclaimer.html, ...)
  // ---------------------------------------------------------------------------
  app.use('/legal', express.static(path.join(projRootDir, 'webroot')));

  // ---------------------------------------------------------------------------
  // Initialize services: db, passport, pubsub, sse + Express-only API routes.
  // ---------------------------------------------------------------------------
  await services.initServices(app);

  // ---------------------------------------------------------------------------
  // Hand everything else off to Next.js (pages + pages/api + static assets).
  // ---------------------------------------------------------------------------
  app.all('*', (req: Request, res: Response) => {
    return nextHandler(req, res);
  });

  app.listen(PORT, () => {
    logger.info(`WildfireCheck listening on port ${PORT}`);
    logger.info('Press Ctrl+C to quit.');
  });
}

main().catch((err) => {
  logger.error('Fatal startup error: %s', err && err.stack ? err.stack : err);
  process.exit(1);
});
