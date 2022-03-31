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

// Selected Fires

import React, { Component } from "react";
import {getServerUrl, serverGet, FirePreview, Legalese} from './OctReactUtils';

/**
 * Show voting stats
 * @param {*} props
 */
function VoteStats(props) {
  return (
    <div>
      {Math.round(props.potFire.avgVote * 100)} % votes for real fire
    </div>
  );
}

class SelectedFires extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    const serverUrl = getServerUrl('/api/selectedFires');
    const resp = await serverGet(serverUrl);
    const selectedFires = await resp.json();
    this.setState({selectedFires: selectedFires});
  }

  render() {
    return (
      <div>
        <h1 className="w3-padding-32 w3-row-padding">
          Selected Fires
        </h1>
        <Legalese/>
        <p>
          This page shows selected fires.
          Therefore, it is not suitable for monitoring for earliest notification of potential fires.
          This page is intended for demonstrating the capability of the system.
        </p>
        {
          this.state.selectedFires && this.state.selectedFires.map(potFire =>
            <FirePreview key={potFire.annotatedUrl} potFire={potFire}
              childComponent={<VoteStats potFire={potFire} />}
            />)
        }
      </div>
    );
  }
}

export default SelectedFires;
