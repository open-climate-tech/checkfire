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

// React frontend

import React, { Component } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import './App.css';
import PotentialFires from './PotentialFires';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="Disclaimer">
          <p>
            Please note that this site does not alert the fire authorities directly.
            If you discover a real fire that recently ignited,
            consider informing the fire department to take appropriate action.
          </p>
          <a href="/disclaimer.html">Disclaimer</a>
        </header>
        <Router>
          <Switch>
            <Route path="/" component={PotentialFires} />
          </Switch>
        </Router>
      </div>
    );  
  }
}

export default App;
