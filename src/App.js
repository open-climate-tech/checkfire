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
// React frontend

import React, { Component } from "react";
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      potentialFires: []
    };
    if (process.env.NODE_ENV === 'development') {
      this.state.eventsUrl = `http://localhost:${process.env.REACT_APP_BE_PORT}/fireEvents`;
      this.state.apiUrl = `http://localhost:${process.env.REACT_APP_BE_PORT}/api`;
    } else {
      this.state.eventsUrl = "/fireEvents";
      this.state.apiUrl = "/api";
    }
  }

  componentDidMount() {
    this.eventSource = new EventSource(this.state.eventsUrl);
    this.eventSource.addEventListener("newPotentialFire", e => {
      console.log('UpdateLEID', e.lastEventId);
      this.newPotentialFire(e)
    });
    this.eventSource.addEventListener("closedConnection", e =>
      this.stopUpdates(e)
    );
  }

  newPotentialFire(e) {
    console.log('newPotentialFire', e);
    const parsed = JSON.parse(e.data);
    const updatedFires = [parsed].concat(this.state.potentialFires);
    const newState = Object.assign({}, this.state);
    newState.potentialFires = updatedFires;
    this.setState(newState);
  }

  stopUpdates(e) {
    console.log('stopUpdates', e);
    this.eventSource.close();
  }

  render() {
    return (
      <div className="App">
        <header className="Disclaimer">
          Disclaimer: xxx
        </header>
        <p>Node env is in <b>{process.env.NODE_ENV}</b> mode.</p>
        <p>Backend port is <b>{process.env.REACT_APP_BE_PORT}</b> value.</p>
        <p><a href={this.state.apiUrl}>/api</a></p>
        <p><a href={this.state.eventsUrl}>eventsource</a></p>
        <ul className="FireList">
          {
              this.state.potentialFires.map(potFire => {
              return (<li key={potFire.annotatedUrl} className="FireListElement" data-testid="FireListElement">
                  <div>
                    Potential fire visible from camera {potFire.cameraID} with score {potFire.adjScore}
                  </div>
                  <a href={potFire.annotatedUrl}>
                    <img width="500" src={potFire.annotatedUrl} alt="potential fire"></img>
                  </a>
                </li>);
            })            
          }
        </ul>
      </div>
    );  
  }
}

export default App;
