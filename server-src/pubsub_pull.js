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
// Google Pubsub listener for potential fire messages from Detection service

import * as oct_utils from './oct_utils';
const { PubSub } = require('@google-cloud/pubsub');

/**
 * Create a new pubsub subscription for this nodejs process.
 * Uses 1 day expiration time to get auto-cleanup when/if this node process dies
 * Uses current time as part of the name for easy monitoring and random value for uniqueness
 * 
 * @param {PubSub} pubSubClient 
 * @param {string} topicName 
 */
async function createSub(pubSubClient, topicName) {
  const d = new Date()
  // generate a unique name
  const subName = 'firecam-sub-' + 'M' + d.getMonth() + 'D' + d.getDate() + 'H' + d.getHours() +
                  'u' + Math.floor(Math.random()*1000);
  const oneDaySeconds = 3600 * 24; // minimum duration is 1 day
  const options = {
    expirationPolicy: {
      ttl: {
        seconds: oneDaySeconds 
      }
    },
    messageRetentionDuration: oneDaySeconds
  };

  const res = await oct_utils.retryWrap(async () => {
    return await pubSubClient.createSubscription(topicName, subName, options);
  });
  return res[0];
}

/**
 * Initialize Google Pubsub module to listen to potential fire notifications
 * @param {json} config 
 * @param {function} sseUpdate 
 */
export async function initPubSub(config, sseUpdate) {
  if (!config.pubsubTopic) {
    return;
  }
  const options = {};
  if (config.gcpServiceKey) {
    options.keyFilename = config.gcpServiceKey;
  }
  const pubSubClient = new PubSub(options);
  const subscription = await createSub(pubSubClient, config.pubsubTopic);

  const messageHandler = message => {
    message.ack();
    sseUpdate(message.data);
  };

  subscription.on('message', messageHandler);
}
