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

// Create the Express app synchronously so it can be exported for tests before
// async initialization completes. Tests attach an 'app_ready' listener and wait
// for it to fire before running requests.
const app = express();

// Sticky 'app_ready' event: if a listener is registered after the event has
// already fired (race condition), invoke it immediately on the next tick.
// We operate on the underlying EventEmitter to avoid Express's narrow type for
// app.on(), which only accepts 'mount'.
import { EventEmitter } from 'events';
const _emitter: EventEmitter = app as unknown as EventEmitter;
const _realEmitterOn = _emitter.on.bind(_emitter);
let _appReady = false;
_emitter.on = function (event: string, listener: (...args: any[]) => void) {
  if (event === 'app_ready' && _appReady) {
    process.nextTick(listener);
    return _emitter;
  }
  return _realEmitterOn(event, listener);
};

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
const trusted = ["'self'"];
if (process.env.NODE_ENV === 'development') {
  trusted.push('http://localhost:*');
}
app.use(
  helmet({
    contentSecurityPolicy: {
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
    },
    crossOriginEmbedderPolicy: { policy: 'credentialless' },
  })
);

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
// Async initialization: Next.js prepare, services, then signal ready.
// ---------------------------------------------------------------------------
async function main() {
  await nextApp.prepare();

  // ---------------------------------------------------------------------------
  // Initialize services: db, passport, pubsub, sse + Express-only API routes.
  // ---------------------------------------------------------------------------
  await services.initServices(app);

  // ---------------------------------------------------------------------------
  // Hand everything else off to Next.js (pages + pages/api + static assets).
  // ---------------------------------------------------------------------------
  app.use((req: Request, res: Response) => {
    return nextHandler(req, res);
  });

  // Signal to tests (and any other listeners) that the app is fully ready.
  _appReady = true;
  app.emit('app_ready');

  app.listen(PORT, () => {
    logger.info(`WildfireCheck listening on port ${PORT}`);
    logger.info('Press Ctrl+C to quit.');
  });
}

main().catch((err) => {
  logger.error('Fatal startup error: %s', err && err.stack ? err.stack : err);
  process.exit(1);
});

module.exports = app;
