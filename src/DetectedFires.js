/*
# Copyright 2021 Open Climate Tech Contributors
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

// Detected Fires

import React, { Component } from 'react';
import {
  getServerUrl,
  serverGet,
  serverPost,
  FirePreview,
  VoteButtons,
} from './OctReactUtils';

class DetectedFires extends Component {
  constructor(props) {
    super(props);
    this.state = {
      detectedFires: [],
    };
  }

  async componentDidMount() {
    const queryParams = new URLSearchParams(window.location.search);
    const weatherFilterStr = queryParams.get('weatherFilter');
    const weatherFilter = weatherFilterStr && weatherFilterStr === 'true';
    const serverUrl = getServerUrl('/api/detectedFires');
    const resp = await serverGet(serverUrl);
    let detectedFires = await resp.json();
    if (weatherFilter) {
      detectedFires = detectedFires.filter(
        (potFire) => potFire.weatherScore > 0.3
      );
    }
    this.setState({ detectedFires: detectedFires });
  }

  async vote(potFire, voteType) {
    const serverUrl = getServerUrl(
      voteType === 'undo' ? '/api/undoVoteFire' : '/api/voteFire'
    );
    const serverRes = await serverPost(serverUrl, {
      cameraID: potFire.cameraID,
      timestamp: potFire.timestamp,
      isRealFire: voteType === 'yes',
    });
    console.log('post res', serverRes);
    if (serverRes === 'success') {
      const detectedFires = this.state.detectedFires.map((pFire) => {
        if (
          pFire.cameraID !== potFire.cameraID ||
          pFire.timestamp !== potFire.timestamp
        ) {
          return pFire;
        }
        const updatedFire = Object.assign({}, pFire);
        if (voteType === 'undo') {
          delete updatedFire.voted;
        } else {
          updatedFire.voted = voteType === 'yes';
        }
        return updatedFire;
      });
      this.setState({ detectedFires: detectedFires });
    } else {
      window.location.reload();
    }
  }

  render() {
    return (
      <div>
        <h1 className="w3-padding-32 w3-row-padding">Detected Fires</h1>
        <p>
          This page shows detected fires that did not made it to alerts due to
          low scores or prototype status
        </p>
        {this.state.detectedFires &&
          this.state.detectedFires.map((potFire) => (
            <FirePreview
              key={potFire.annotatedUrl}
              potFire={potFire}
              showProto={true}
              childComponent={
                <VoteButtons
                  potFire={potFire}
                  validCookie={true}
                  onVote={(f, v) => this.vote(f, v)}
                />
              }
            />
          ))}
      </div>
    );
  }
}

export default DetectedFires;
