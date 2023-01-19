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
import * as oct_utils from './oct_utils';

const logger = oct_utils.getLogger('db_mgr');

/**
 * Initilize the SQL DB connection using parameter in config
 * Currently supports SQLite, Postgress, and "nop" DB for testing
 * @param {object} config
 * @return {object} db
 */
export class DbMgr {
  constructor(config, useSocket=false) {
    this.dbType = 'nop'; // missing DB

    if (config.db_file) {
      // SQLite
      this.dbType = 'sqlite';
      this.sqlite = new sqlite3.Database(config.db_file, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          logger.error(err.message);
        }
        logger.info('Using sqlite %s', config.db_file);
      });
    } else if (config.psqlHost) {
      // Postgres
      this.dbType = 'psql';
      // initialize a pool
      this.pool = new Pool({
        host: useSocket ? config.psqlSocket : config.psqlHost,
        database: config.psqlDb,
        user: config.psqlUser,
        password: config.psqlPasswd
      });
      this.pool.on('error', (err, client) => {
        logger.error('Pool error', err);
      });
    }
  }

  /**
   * Query the database with given SQL query
   * @param {string} queryStr
   * @return {Array} array of query results
   */
  async query(queryStr) {
    if (this.dbType === 'sqlite') {
      let dbAllP = util.promisify(this.sqlite.all).bind(this.sqlite);
      return await dbAllP(queryStr);
    } else if (this.dbType === 'psql') {
      const res = await this.pool.query(queryStr);
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
  async insert(tableName, keys, values) {
    let sqlCmd = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${values.map(x=> "'" + x + "'").join(',')})`
    // console.log('sqlC', sqlCmd);
    if (this.dbType === 'sqlite') {
      let dbRunP = util.promisify(this.sqlite.run).bind(this.sqlite);
      return await dbRunP(sqlCmd);
    } else if (this.dbType === 'psql') {
      return await this.pool.query(sqlCmd);
    }
  }

  /**
   * Insert of update existing row in table given primary keys/values (queryKeys/queryValues)
   * @param {string} tableName
   * @param {Array<string>} dataKeys - column names of data to store
   * @param {Array<>} dataValues - array matching dataKeys with values to write
   * @param {Array<string>} queryKeys - column names to check if there's already existing row
   * @param {Array<>} queryValues - array matching queryKeys with values to check and write
   */
  async insertOrUpdate(tableName, dataKeys, dataValues, queryKeys, queryValues) {
    // TODO: wrap this in a txinsertOrUpdate
    const queryKeyVals = queryKeys.map((queryKey, index) => `${queryKey} = '${queryValues[index]}'`);
    const sqlQuery = `select * from ${tableName} where ${queryKeyVals.join(' and ')}`;
    const queryRes = await this.query(sqlQuery);
    if (queryRes && queryRes[0]) {
      // update
      const dataKeyVals = dataKeys.map((dataKey, index) => `${dataKey} = '${dataValues[index]}'`);
      const sqlCmd = `update ${tableName} set ${dataKeyVals.join(', ')} where ${queryKeyVals.join(' and ')}`;
      return await this.query(sqlCmd);
    } else {
      // insert
      return await this.insert(tableName, dataKeys.concat(queryKeys), dataValues.concat(queryValues));
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
   async insertIfNew(tableName, dataKeys, dataValues, queryKey, queryValue) {
    // TODO: wrap this in a tx
    const sqlQuery = `select * from ${tableName} where ${queryKey} = '${queryValue}'`;
    const queryRes = await this.query(sqlQuery);
    if (queryRes && queryRes[0]) {
      // noop
      return Promise.resolve();
    } else {
      // insert
      return this.insert(tableName, dataKeys.concat(queryKey), dataValues.concat(queryValue));
    }
  }

  /**
   * Close the DB connection
   */
  close() {
    if (this.dbType === 'sqlite') {
      return this.sqlite.close();
    } else if (this.dbType === 'psql') {
      throw new Error('psql not implemented');
    } else {
      return null;
    }    
  }
}
