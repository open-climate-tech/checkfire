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

// Prototype pages still under development

import React, { Component } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
} from "react-router-dom";
import Auth from './Auth';
import PotentialFires from './PotentialFires';
import ConfirmedFires from './ConfirmedFires';

class Prototypes extends Component {
  render() {
    return (
      <Router>
        <h1>
          Prototypes
        </h1>
        <Link to='/auth'><li>Auth</li></Link>
        <Link to='/potential'><li>Original Potential Fires</li></Link>
        <Link to='/confirmed'><li>Confirmed Fires</li></Link>
        <Switch>
          <Route path="/auth" exact component={Auth} />
          <Route path="/potential" exact component={PotentialFires} />
          <Route path="/confirmed" exact component={ConfirmedFires} />
        </Switch>
      </Router>
    );
  }
}

export default Prototypes;
