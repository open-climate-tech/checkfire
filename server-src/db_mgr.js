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
// SQL DB accessor that interfaces to either SQLite or Postgres

const util = require('util');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const oct_utils = require('./oct_utils');

const logger = oct_utils.getLogger('db_mgr');

/**
 * Initilize the SQL DB connection using parameter in config
 * Currently supports SQLite, Postgress, and "nop" DB for testing
 * @param {object} config
 * @return {object} db
 */
async function initDB(config, useSocket=false) {
  let db = {};
  if (config.db_file) {
    // SQLite
    db.dbType = 'sqlite';
    db.sqlite = new sqlite3.Database(config.db_file, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        logger.error(err.message);
      }
      logger.info('Using sqlite %s', config.db_file);
    });
  } else if (config.psqlHost) {
    // Postgres
    db.dbType = 'psql';
    // initialize a pool
    db.pool = new Pool({
      host: useSocket ? config.psqlSocket : config.psqlHost,
      database: config.psqlDb,
      user: config.psqlUser,
      password: config.psqlPasswd
    });
    db.pool.on('error', (err, client) => {
      logger.error('Pool error', err);
    });
  } else {
    // missing DB
    db.dbType = 'nop';
  }

  /**
   * Query the database with given SQL query
   * @param {string} queryStr
   * @return {Array} array of query results
   */
  db.query = async function dbQuery(queryStr) {
    if (db.dbType === 'sqlite') {
      let dbAllP = util.promisify(db.sqlite.all).bind(db.sqlite);
      return await dbAllP(queryStr);
    } else if (db.dbType === 'psql') {
      const res = await db.pool.query(queryStr);
      return res.rows;
    } else {
      return null;
    }
  }

  /**
   * Insert given data into given table
   * @param {string} tableName
   * @param {Array<string>} keys - table column names
   * @param {Array<string>} values - column values
   */
  db.insert = async function dbInsert(tableName, keys, values) {
    let sqlCmd = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${values.map(x=> "'" + x + "'").join(',')})`
    console.log('sqlC', sqlCmd);
    if (db.dbType === 'sqlite') {
      let dbRunP = util.promisify(db.sqlite.run).bind(db.sqlite);
      return await dbRunP(sqlCmd);
    } else if (db.dbType === 'psql') {
      return await db.pool.query(sqlCmd);
    }
  }

  /**
   * Insert of update existing row in table given primary key/value (queryKey/queryValue)
   * @param {string} tableName
   * @param {Array<string>} dataKeys
   * @param {Array<>} dataValues
   * @param {string} queryKey
   * @param {*} queryValue
   */
  db.insertOrUpdate = async function insertOrUpdate(tableName, dataKeys, dataValues, queryKey, queryValue) {
    // TODO: wrap this in a tx
    const sqlQuery = `select * from ${tableName} where ${queryKey} = '${queryValue}'`;
    const queryRes = await db.query(sqlQuery);
    if (queryRes && queryRes[0]) {
      // update
      const dataKeyVals = dataKeys.map((dataKey, index) => `${dataKey} = '${dataValues[index]}'`);
      const sqlCmd = `update ${tableName} set ${dataKeyVals.join(', ')} where ${queryKey} = '${queryValue}'`;
      console.log('sqlC', sqlCmd);
      return await db.query(sqlCmd);
    } else {
      // insert
      return db.insert(tableName, dataKeys.concat(queryKey), dataValues.concat(queryValue));
    }
  }

  /**
   * Insert if there's no existing row in table with given primary key/value (queryKey/queryValue)
   * @param {string} tableName
   * @param {Array<string>} dataKeys
   * @param {Array<>} dataValues
   * @param {string} queryKey
   * @param {*} queryValue
   */
   db.insertIfNew = async function insertIfNew(tableName, dataKeys, dataValues, queryKey, queryValue) {
    // TODO: wrap this in a tx
    const sqlQuery = `select * from ${tableName} where ${queryKey} = '${queryValue}'`;
    const queryRes = await db.query(sqlQuery);
    if (queryRes && queryRes[0]) {
      // noop
      return Promise.resolve();
    } else {
      // insert
      return db.insert(tableName, dataKeys.concat(queryKey), dataValues.concat(queryValue));
    }
  }

  /**
   * Close the DB connection
   */
  db.close = function dbClose() {
    if (db.dbType === 'sqlite') {
      return db.sqlite.close();
    } else if (db.dbType === 'psql') {
      throw new Error('psql not implemented');
    } else {
      return null;
    }    
  }

  return db;
}

exports.initDB = initDB;
