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

function initDB(config) {
  let db = {};
  if (config.db_file) {
    // SQLite
    db.dbType = 'sqlite';
    db.sqlite = new sqlite3.Database(config.db_file, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Using sqlite %s', config.db_file);
    });
  } else if (config.psqlHost) {
    // Postgres
    db.dbType = 'psql';
    throw new Error('psql not implemented');
  } else {
    // missing DB
    db.dbType = 'nop';
  }

  db.query = async function dbQuery(queryStr) {
    if (db.dbType === 'sqlite') {
      let dbAllP = util.promisify(db.sqlite.all).bind(db.sqlite);
      return await dbAllP(queryStr);
    } else if (db.dbType === 'psql') {
      throw new Error('psql not implemented');
    } else {
      return null;
    }
  }

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
