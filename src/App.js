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
    this.sseVersion = null;
  }

  componentDidMount() {
    this.eventSource = new EventSource(this.state.eventsUrl);
    this.eventSource.addEventListener("newPotentialFire", e => {
      // console.log('UpdateLEID', e.lastEventId);
      this.newPotentialFire(e)
    });
    this.eventSource.addEventListener("closedConnection", e =>
      this.stopUpdates(e)
    );
  }

  newPotentialFire(e) {
    // console.log('newPotentialFire', e);
    const parsed = JSON.parse(e.data);
    // first check version number
    if (!this.sseVersion) { // record version number on first response
      this.sseVersion = parsed.version;
      console.log('Checkfire SSE version', this.sseVersion);
    }
    if (this.sseVersion !== parsed.version) {
      // reload page on version mismatch
      console.log('Checkfire SSE mismatch', this.sseVersion, parsed.version);
      window.location.reload();
    }

    // next check for duplicate
    const alreadyExists = this.state.potentialFires.find(i =>
       ((i.timestamp === parsed.timestamp) && (i.cameraID === parsed.cameraID)));
    if (alreadyExists) {
      return;
    }

    // now insert new fires at right timeslot
    const updatedFires = [parsed].concat(this.state.potentialFires)
      .sort((a,b) => (b.timestamp - a.timestamp)) // sort by timestamp descending
      .slice(0, 20);  // limit to most recent 20

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
          <h1>
            This site is currently under construction and showing test data.
          </h1>
          <p>
            In case someone discovers a real fire that recently ignited, they should consider informing the wildfire
            dispatch center to take appropriate action.  Please note that this site does not alert the authorities directly.
          </p>
          <a href="/disclaimer.html">Disclaimer</a>
        </header>
        <h1 className="w3-padding-32 w3-row-padding" id="projects">Potential fires</h1>
        {
          this.state.potentialFires.map(potFire => {
            return (
              <div key={potFire.annotatedUrl} data-testid="FireListElement">
                <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
                  <h5>
                    {new Date(potFire.timestamp * 1000).toLocaleString("en-US")}:&nbsp;
                    {potFire.camInfo.cameraName} camera
                    {potFire.camInfo.cameraDir ? ' facing ' + potFire.camInfo.cameraDir : ''}
                    &nbsp;with score {Number(potFire.adjScore).toFixed(2)}
                    &nbsp;(
                    <a href={potFire.annotatedUrl} target="_blank" rel="noopener noreferrer">full image</a>
                    )
                  </h5>
                  <video controls autoPlay muted loop width="898" height="898" poster={potFire.croppedUrl}>
                    <source src={potFire.croppedUrl} type="video/mp4" />
                    Your browser does not support the video tag
                  </video>
                </div>
                &nbsp;
              </div>
            );
          })
        }
      </div>
    );  
  }
}

export default App;
