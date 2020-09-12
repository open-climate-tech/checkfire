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

// Display live feed of recent potential fires with option to vote

import React, { Component } from "react";
import googleSigninImg from './btn_google_signin_dark_normal_web.png';
import googleSigninImgFocus from './btn_google_signin_dark_focus_web.png';
import {getServerUrl, serverPost} from './OctReactUtils';

/**
 * Show voting buttons (yes/no), or already cast vote, or signin button
 * @param {*} props
 */
function VoteButtons(props) {
  if (!props.validCookie) {
    return (
    <div>
      <p>Is this a fire?</p>
      <button style={{padding: 0, outline: "none", border: "none"}} onClick={()=> props.signin()}>
      <img src={googleSigninImg} alt="Sign in with Google"
         onMouseOver={e=>(e.currentTarget.src=googleSigninImgFocus)}
         onMouseOut={e=>(e.currentTarget.src=googleSigninImg)} />
      </button>
      <p>to vote</p>
    </div>
    );
  } else if (props.potFire.voted !== undefined) {
    if (props.potFire.voted) {
      return <p>Thanks for confirming this is a real fire</p>;
    } else {
      return <p>Thanks for confirming this is not a fire</p>;
    }
  } else {
    return (
    <div>
      <p>Is this a fire?</p>
      <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> props.onVote(props.potFire, true)}>
        <i className="fa fa-fire" style={{color: "red"}} />
        &nbsp;Real fire
      </button>
      <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> props.onVote(props.potFire, false)}>
        <i className="fa fa-close" />
        &nbsp;Not a fire
      </button>
    </div>
    );
  }
}

/**
 * Show preview of the potential fire along with voting buttons
 * @param {*} props
 */
function FirePreview(props) {
  return (
    <div key={props.potFire.annotatedUrl} data-testid="FireListElement">
      <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
        <h5>
          {new Date(props.potFire.timestamp * 1000).toLocaleString("en-US")}:&nbsp;
          {props.potFire.camInfo.cameraName} camera
          {props.potFire.camInfo.cameraDir && ' facing ' + props.potFire.camInfo.cameraDir}
          &nbsp;with score {Number(props.potFire.adjScore).toFixed(2)}
          &nbsp;(
          <a href={props.potFire.annotatedUrl} target="_blank" rel="noopener noreferrer">full image</a>
          )
        </h5>
        <div className="w3-col m8">
          <video controls autoPlay muted loop width="800" height="600" poster={props.potFire.croppedUrl}>
            <source src={props.potFire.croppedUrl} type="video/mp4" />
            Your browser does not support the video tag
          </video>
        </div>
        <div className="w3-col m4">
          <VoteButtons validCookie={props.validCookie} potFire={props.potFire}
            onVote={props.onVote}
            signin={props.signin}
           />
          <div className="w3-padding-32">
            <p>View area</p>
            <img width="320" height="320" src={props.potFire.mapUrl} alt="Viewshed" />
          </div>
        </div>
      </div>
      &nbsp;
    </div>
  );
}

class VoteFires extends Component {
  constructor(props) {
    super(props);
    this.state = {
      potentialFires: [],
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
    const sseConfig = {};
    if (process.env.NODE_ENV === 'development') {
      sseConfig.withCredentials = true; //send cookies to dev server on separate port
    }
    this.eventSource = new EventSource(this.state.eventsUrl, sseConfig);
    this.eventSource.addEventListener("newPotentialFire", e => {
      // console.log('UpdateLEID', e.lastEventId);
      this.newPotentialFire(e)
    });
    this.eventSource.addEventListener("closedConnection", e =>
      this.stopUpdates(e)
    );
  }

  componentWillUnmount() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null;
    }
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

  async vote(potFire, isRealFire) {
    const serverUrl = getServerUrl('/api/voteFire');
    const serverRes = await serverPost(serverUrl, {
      cameraID: potFire.cameraID,
      timestamp: potFire.timestamp,
      isRealFire: isRealFire,
    });
    console.log('post res', serverRes);
    if (serverRes === 'success') {
      const newState = Object.assign({}, this.state);
      newState.potentialFires = newState.potentialFires.map(pFire => {
        if ((pFire.cameraID !== potFire.cameraID) || (pFire.timestamp !== potFire.timestamp)) {
          return pFire;
        }
        const updatedFire = Object.assign({}, pFire);
        updatedFire.voted = isRealFire;
        return updatedFire;
      });
      this.setState(newState);
    } else {
      this.props.invalidateCookie();
    }
  }

  render() {
    return (
      <div>
        <h1 className="w3-padding-32 w3-row-padding" id="projects">
          Potential fires
        </h1>
        {
          this.state.potentialFires.map(potFire =>
            <FirePreview key={potFire.annotatedUrl}
             potFire={potFire} validCookie={this.props.validCookie}
             onVote={(f,v) => this.vote(f,v)}
             signin={this.props.signin}
            />
          )
        }
      </div>
    );
  }
}

export default VoteFires;
