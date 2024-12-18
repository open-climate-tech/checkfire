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

// Confirmed Fires

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { getServerUrl, serverGet, FirePreview } from './OctReactUtils';

/**
 * Show voting stats
 * @param {*} props
 */
function VoteStats(props) {
  return (
    <div>{Math.round(props.potFire.avgVote * 100)} % votes for real fire</div>
  );
}

class ConfirmedFires extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    const serverUrl = getServerUrl('/api/confirmedFires');
    const resp = await serverGet(serverUrl);
    const confirmedFires = await resp.json();
    this.setState({ confirmedFires: confirmedFires });
  }

  render() {
    return (
      <div>
        <h1 className="w3-padding-32 w3-row-padding">Confirmed Fires</h1>
        <p>
          This page shows recent potential fires that have been confirmed by
          majority of the voting users. There is an inherent delay in waiting
          for someone to vote and confirm a fire, so this page will never
          display events as quickly as the{' '}
          <Link to="/wildfirecheck">Potential Fires</Link> page. This page also
          does not check potential fire locations against the your preferred
          region of interest, but instead shows fires from all cameras. Finally,
          this page also does does not automatically refresh on new detections.
          Therefore, it is not suitable for monitoring for earliest notification
          of potential fires. This page is intended for demonstrating the
          capability of the system.
        </p>
        {this.state.confirmedFires &&
          this.state.confirmedFires.map((potFire) => (
            <FirePreview
              key={potFire.annotatedUrl}
              potFire={potFire}
              childComponent={<VoteStats potFire={potFire} />}
            />
          ))}
      </div>
    );
  }
}

export default ConfirmedFires;
