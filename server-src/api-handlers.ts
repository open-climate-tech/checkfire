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
// Shared auth utilities used by express-routes.ts and Next.js pages/api routes.

import { Request, Response } from 'express';

import { OCT_Config } from './oct_types';
import * as oct_utils from './oct_utils';

const jwt = require('jsonwebtoken');

const logger = oct_utils.getLogger('api-handlers');

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
export async function apiWrapper(
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



