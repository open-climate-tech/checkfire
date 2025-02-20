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

import util from 'util';
import { Database as SQLiteDb, OPEN_READWRITE as SQLite_RW } from 'sqlite3';
import { Pool } from 'pg';
import * as oct_utils from './oct_utils';
import { OCT_Config } from './oct_types';

const logger = oct_utils.getLogger('db_mgr');

/**
 * Initilize the SQL DB connection using parameter in config
 * Currently supports SQLite, Postgress, and "nop" DB for testing
 */
export class DbMgr {
  dbType: string;
  sqlite?: SQLiteDb;
  pool?: Pool;

  constructor(config: OCT_Config, useSocket = false) {
    this.dbType = 'nop'; // missing DB

    if (process.env.CI) {
      // temporary memory DB for testing
      config.db_file = ':memory:';
    }
    if (config.db_file) {
      // SQLite
      this.dbType = 'sqlite';
      this.sqlite = new SQLiteDb(config.db_file, SQLite_RW, (err) => {
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
        password: config.psqlPasswd,
      });
      this.pool.on('error', (err, client) => {
        logger.error('Pool error', err);
      });
    }
  }

  /**
   * Query the database with given SQL query
   * @return {Array} array of query results
   */
  async query(queryStr: string): Promise<any> {
    if (this.dbType === 'sqlite' && this.sqlite) {
      const dbAllP = util.promisify(this.sqlite.all).bind(this.sqlite);
      return await dbAllP(queryStr);
    } else if (this.dbType === 'psql' && this.pool) {
      const res = await this.pool.query(queryStr);
      return res.rows;
    } else {
      return null;
    }
  }

  sqliteRunFn() {
    if (!this.sqlite) {
      throw new Error('non sqlite DB');
    }
    return util.promisify(this.sqlite.run).bind(this.sqlite);
  }

  /**
   * Insert given data into given table
   */
  async insert(tableName: string, keys: string[], values: string[]) {
    const sqlCmd = `INSERT INTO ${tableName} (${keys.join(
      ','
    )}) VALUES (${values.map((x) => '\'' + x + '\'').join(',')})`;
    // console.log('sqlC', sqlCmd);
    if (this.dbType === 'sqlite' && this.sqlite) {
      const dbRunP = util.promisify(this.sqlite.run).bind(this.sqlite);
      return await dbRunP(sqlCmd);
    } else if (this.dbType === 'psql' && this.pool) {
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
  async insertOrUpdate(
    tableName: string,
    dataKeys: string[],
    dataValues: any[],
    queryKeys: string[],
    queryValues: any[]
  ) {
    // TODO: wrap this in a txinsertOrUpdate
    const queryKeyVals = queryKeys.map(
      (queryKey, index) => `${queryKey} = '${queryValues[index]}'`
    );
    const sqlQuery = `select * from ${tableName} where ${queryKeyVals.join(
      ' and '
    )}`;
    const queryRes = await this.query(sqlQuery);
    if (queryRes && queryRes[0]) {
      // update
      const dataKeyVals = dataKeys.map(
        (dataKey, index) => `${dataKey} = '${dataValues[index]}'`
      );
      const sqlCmd = `update ${tableName} set ${dataKeyVals.join(
        ', '
      )} where ${queryKeyVals.join(' and ')}`;
      return await this.query(sqlCmd);
    } else {
      // insert
      return await this.insert(
        tableName,
        dataKeys.concat(queryKeys),
        dataValues.concat(queryValues)
      );
    }
  }

  /**
   * Insert if there's no existing row in table with given primary key/value (queryKey/queryValue)
   */
  async insertIfNew(
    tableName: string,
    dataKeys: string[],
    dataValues: any[],
    queryKey: string,
    queryValue: any
  ) {
    // TODO: wrap this in a tx
    const sqlQuery = `select * from ${tableName} where ${queryKey} = '${queryValue}'`;
    const queryRes = await this.query(sqlQuery);
    if (queryRes && queryRes[0]) {
      // noop
      return Promise.resolve();
    } else {
      // insert
      return this.insert(
        tableName,
        dataKeys.concat(queryKey),
        dataValues.concat(queryValue)
      );
    }
  }

  /**
   * Close the DB connection
   */
  close() {
    if (this.dbType === 'sqlite' && this.sqlite) {
      return this.sqlite.close();
    } else if (this.dbType === 'psql') {
      throw new Error('psql not implemented');
    } else {
      return null;
    }
  }
}
