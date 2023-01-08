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
// UI backend server

import { Request, Response, NextFunction } from 'express';
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
import helmet from 'helmet';
const path = require('path');
const oct_utils = require('./server-src/oct_utils');
const services = require('./server-src/services')

const logger = oct_utils.getLogger('main');

require('source-map-support').install();
const app = express();

// Setup express middle-ware to log requests and allow CORS for dev environments
app.use(function (req: Request, res: Response, next: NextFunction) {
  const headers = Object.assign({}, req.headers);
  headers.url = req.originalUrl || req.url;
  logger.info('request Headers: %s', JSON.stringify(headers));
  if (process.env.NODE_ENV === 'development') {
    // Permissive CORS to allow for testing with server on differnt port
    if (req.header('origin')) {
      res.setHeader("Access-Control-Allow-Origin", req.header('origin') || '');
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers","origin, content-type, accept");
  }
  next();
});

app.use(helmet());
// setup CSP
const trusted = [
  "'self'",
];
if (process.env.NODE_ENV === 'development') {
  trusted.push('http://localhost:*');
}
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: trusted,
    scriptSrc: [
      "'unsafe-inline'",
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
      'www.googletagmanager.com',
      'storage.googleapis.com',
      '*.openstreetmap.org',
    ].concat(trusted),
    mediaSrc: [
      'storage.googleapis.com',
    ].concat(trusted),
    connectSrc: [
      'www.google-analytics.com',
    ].concat(trusted),
  },
}));
// allow non-CORS sites
app.use(helmet.crossOriginEmbedderPolicy({policy: "credentialless"}));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Redirect http to https
app.use(function(req: Request, res: Response, next: NextFunction) {
  if(req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === "http") {
    return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }
  next();
});

// static webpage for /
const projRootDir = path.dirname(__dirname);

app.use('/', express.static(path.join(projRootDir, 'webroot')));
// react app for /wildfirecheck
app.use('/wildfirecheck', express.static(path.join(projRootDir, 'build')));
app.use('/static', express.static(path.join(projRootDir, 'build/static')));
app.use('/img', express.static(path.join(projRootDir, 'build/img')));

// initialize dyanmic services
services.initServices(app, () => {
  // Start the server
  const PORT = process.env.PORT || 3141;
  app.listen(PORT, () => {
    logger.info(`WildfireCheck back listening on port ${PORT}`);
    logger.info('Press Ctrl+C to quit.');
  });
});

module.exports = app;
