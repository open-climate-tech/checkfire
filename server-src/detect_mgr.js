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
// Manage detect instances

const oct_utils = require('./oct_utils');
const logger = oct_utils.getLogger('detect_mgr');
const Compute = require('@google-cloud/compute');
const { DateTime } = require('luxon');
const CHECK_MINUTES = 10; // check every 10 minutes

/**
 * Check number of detection instances are valid for currnet time
 * @param {object} config
 */
async function checkInstances(config) {
  if (!config.detectZone || !config.detectGroup ||
      !config.detectStartTime || !config.detectEndTime || !config.detectNumInstances) {
    logger.error('Missing detect management settings');
    return;
  }
  if (config.detectEndTime < config.detectStartTime) {
    logger.error('End (%s) before Start (%s)', config.detectEndTime, config.detectStartTime);
    return;
  }
  // start/end times in config are based on local timezone, so adjust current time
  const now = DateTime.utc().setZone(config.timeZome).toLocaleString(DateTime.TIME_24_SIMPLE);
  logger.info('Now (%s), Start (%s), End (%s)', now, config.detectStartTime, config.detectEndTime);
  const expected = (now < config.detectStartTime) ? 0 :
                   (now >= config.detectEndTime) ? 0 :
                   config.detectNumInstances;

  const options = {};
  if (config.gcpServiceKey) {
    options.keyFilename = config.gcpServiceKey;
    options.projectId = config.gcpProject;
  }
  const compute = new Compute(options);
  const zone = compute.zone(config.detectZone);
  const instanceGroupMgrs = await zone.getInstanceGroupManagers();
  const instanceGroupMgr = instanceGroupMgrs[0].find(i => i.name === config.detectGroup);
  const instanceVMs = await instanceGroupMgr.getManagedInstances();
  const found = instanceVMs[0].length;
  logger.info('Num instances expected (%d), found (%d)', expected, found);

  if (found != expected) {
    await instanceGroupMgr.resize(expected);
    logger.info('resized to %d', expected);
    // deletion is a more drastic way that is not currently necessary,
    // but leaving commented out code here in case something changes
    // await instanceGroupMgr.deleteInstances(instanceVMs[0].slice(0, found - expected));
  }
}

/**
 * Initialize manager for detection instances
 * @param {object} config
 */
async function initMgr(config) 
{
  // check immediately at startup
  await checkInstances(config);
  // setup regular periodic check as well
  setInterval(
    async () => {
      try {
        await checkInstances(config);
      } catch (e) {
        logger.error('Error: %s', e.message);
      }
    },
    1000 * 60 * CHECK_MINUTES
  );
}

exports.initMgr = initMgr;
