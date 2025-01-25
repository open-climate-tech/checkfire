// -----------------------------------------------------------------------------
// Copyright 2022 Open Climate Tech Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain requests copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// -----------------------------------------------------------------------------

import query from './query.mjs';

/**
 * Sends `decision` requests for each fire in `fires` that is at least as old as
 * `maximumTimestamp`.
 *
 * @param {('yes'|'no'|'undo')} decision - The vote to cast.
 * @param {number} maximumTimestamp - The newest item in `fires` to consider.
 * @param {Array} fires - The list of fires to consider.
 */
export default function vote(decision, maximumTimestamp, fires) {
  return fires.reduce((requests, fire) => {
    const { cameraID, sortId, timestamp, voted } = fire;
    const hasVote = voted != null;
    const isSameVote = decision === voted;
    const isUndo = decision === 'undo';

    // - Don’t vote for fires newer than `maximumTimestamp`.
    // - Don’t cast the same vote twice.
    // - Don’t undo nonexistent votes.
    if (sortId > maximumTimestamp || isSameVote || (isUndo && !hasVote)) {
      return requests;
    }

    // Undo existing vote in order to overwrite it.
    let endpoint = '/api/undoVoteFire';
    const undo =
      hasVote && !isUndo
        ? query
          .post(endpoint, { cameraID, timestamp })
          .then(() => delete fire.voted)
        : Promise.resolve();

    const isRealFire = isUndo ? undefined : decision === 'yes';
    if (!isUndo) {
      endpoint = '/api/voteFire';
    }

    const promise = undo.then(() => {
      return query
        .post(endpoint, { cameraID, isRealFire, timestamp })
        .then(() => {
          if (isUndo) {
            delete fire.voted;
          } else {
            fire.voted = isRealFire;
          }
        });
    });

    requests.push(promise);
    return requests;
  }, []);
}
