/*
# Copyright 2020 Open Climate Tech Contributors
# Licensed under the Apache License, Version 2.0
*/

'use strict';
// Service initialization. Owns the singletons (config, db) and is the integration
// point between the Express custom server and Next.js pages/api routes.

import { Application } from 'express';

import { DbMgr } from './db_mgr';
import * as sse from './sse';
import * as pubsub from './pubsub_pull';
import * as oct_utils from './oct_utils';
import { OCT_Config } from './oct_types';
import { initExpressRoutes } from './express-routes';

const logger = oct_utils.getLogger('services');

let _config: OCT_Config | null = null;
let _db: DbMgr | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * Singleton accessor for the database manager.
 * Pages/api handlers call this to get the shared DbMgr instance.
 */
export async function getDb(): Promise<DbMgr> {
  await ensureInitialized();
  if (!_db) {
    throw new Error('DbMgr not initialized');
  }
  return _db;
}

/**
 * Singleton accessor for the parsed configuration.
 */
export async function getConfig(): Promise<OCT_Config> {
  await ensureInitialized();
  if (!_config) {
    throw new Error('Config not loaded');
  }
  return _config;
}

/**
 * Idempotent initialization of config + db. Safe to call from anywhere
 * (Express server start, pages/api handlers, etc.).
 */
async function ensureInitialized(): Promise<void> {
  if (_config && _db) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const cfg = await oct_utils.getConfig();
    _config = cfg;
    _db = new DbMgr(cfg);
    logger.info('Services singletons initialized');
  })();
  return _initPromise;
}

/**
 * Full initialization for the Express custom server: loads config, opens db,
 * registers Express-only routes (passport flow + SSE), and starts PubSub.
 */
export async function initServices(app: Application): Promise<void> {
  await ensureInitialized();
  const config = _config!;
  const db = _db!;
  app.locals.db = db;
  app.locals.config = config;

  initExpressRoutes(config, app, db);
  const updateFromDetect = sse.initSSE(config, app, db);
  await pubsub.initPubSub(config, updateFromDetect);
}
