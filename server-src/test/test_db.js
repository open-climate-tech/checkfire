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

/**
 * Helpers for DB for testing
 */

export async function setupDb(db) {
  const dbRunFn = db.sqliteRunFn();
  /**
   * These schemas are copied over from https://github.com/open-climate-tech/firecam/blob/master/firecam/lib/db_manager.py
   * TODO: Switch to submodule or other mechanism instead of copy-paste
   */
  const sources_schema = [
    ['name', 'TEXT'],
    ['url', 'TEXT'],
    ['randomID', 'REAL'],
    ['dormant', 'INT'],
    ['type', 'TEXT'],
    ['locationID', 'TEXT'],
  ];
  const cameras_schema = [
    ['Name', 'TEXT'],
    ['Network', 'TEXT'],
    ['Latitude', 'REAL'],
    ['Longitude', 'REAL'],
    ['cameraIDs', 'TEXT'],
    ['locationID', 'TEXT'],
    ['mapFile', 'TEXT'],
    ['CityName', 'TEXT'],
  ];
  const detections_schema = [
    ['CameraName', 'TEXT'],
    ['Timestamp', 'INT'],
    ['AdjScore', 'REAL'],
    ['ImageID', 'TEXT'],
    ['CroppedID', 'TEXT'],
    ['MapID', 'TEXT'],
    ['polygon', 'TEXT'],
    ['sourcePolygons', 'TEXT'],
    ['IsProto', 'INT'],
    ['WeatherScore', 'REAL'],
    ['ImgSequence', 'TEXT'],
    ['SortId', 'INT'],
    ['FireHeading', 'INT'],
    ['AngularWidth', 'INT'],
  ];
  const alerts_schema = [
    ['CameraName', 'TEXT'],
    ['Timestamp', 'INT'],
    ['AdjScore', 'REAL'],
    ['ImageID', 'TEXT'],
    ['CroppedID', 'TEXT'],
    ['MapID', 'TEXT'],
    ['polygon', 'TEXT'],
    ['sourcePolygons', 'TEXT'],
    ['IsProto', 'INT'],
    ['WeatherScore', 'REAL'],
    ['SortId', 'INT'],
    ['FireHeading', 'INT'],
    ['AngularWidth', 'INT'],
  ];
  const votes_schema = [
    ['CameraName', 'TEXT'],
    ['Timestamp', 'INT'],
    ['IsRealFire', 'INT'],
    ['UserID', 'TEXT'],
  ];
  const named_fires_schema = [
    ['CameraName', 'TEXT'],
    ['Timestamp', 'INT'],
    ['FireName', 'TEXT'],
  ];
  const rx_burns_schema = [
    ['Source', 'TEXT'],
    ['Timestamp', 'INT'],
    ['Info', 'TEXT'],
  ];
  const auth_schema = [
    ['UserID', 'TEXT'],
    ['Type', 'TEXT'],
    ['HashedPassword', 'TEXT'],
    ['Salt', 'TEXT'],
    ['Email', 'TEXT'],
    ['EmailVerified', 'INT'],
  ];
  const allTables = {
    sources: sources_schema,
    cameras: cameras_schema,
    detections: detections_schema,
    alerts: alerts_schema,
    votes: votes_schema,
    named_fires: named_fires_schema,
    rx_burns: rx_burns_schema,
    auth: auth_schema,
  };

  for (const tableName of Object.keys(allTables)) {
    const tableSchema = allTables[tableName];
    const sqlSchemaStr = tableSchema
      .map((entry) => {
        const [name, type] = entry;
        return `${name} ${type}`;
      })
      .join(',');
    const sqlCmd = `create table if not exists '${tableName}' (${sqlSchemaStr})`;
    await dbRunFn(sqlCmd);
  }
}
