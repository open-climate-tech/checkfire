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

import React, { Component } from "react";

class ConfirmedFires extends Component {
  // select vt.cameraname, vt.timestamp, alerts.adjscore, alerts.imageid, alerts.croppedid from
  //       (select distinct cameraname,timestamp from votes where isrealfire=1 order by timestamp desc limit 20) as vt
  //       inner join alerts
  //       on vt.cameraname=alerts.cameraname and vt.timestamp=alerts.timestamp
  //       order by vt.timestamp desc limit 20;
  render() {
    return (
      <div>
        <h1>
        Confirmed Fires
        </h1>
        <p>
          Show potential fires that have been confirmed by some users
        </p>
      </div>
    );
  }
}

export default ConfirmedFires;