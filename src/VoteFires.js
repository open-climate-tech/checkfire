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
import {Link} from "react-router-dom";

import googleSigninImg from './btn_google_signin_dark_normal_web.png';
import googleSigninImgFocus from './btn_google_signin_dark_focus_web.png';
import {getServerUrl, serverPost, getUserRegion, FirePreview} from './OctReactUtils';

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

class VoteFires extends Component {
  constructor(props) {
    super(props);
    this.state = {
      potentialFires: [],
      hoursLimit: 2, // 2 hours
      numRecentFires: 0,
      numOldFires: 0,
      showOldFires: false,
    };
    this.sseVersion = null;
  }

  componentDidMount() {
    // setup SSE connection with backend to get updates on new detections
    const sseConfig = {};
    if (process.env.NODE_ENV === 'development') {
      sseConfig.withCredentials = true; //send cookies to dev server on separate port
    }
    const eventsUrl = getServerUrl('/fireEvents');
    this.eventSource = new EventSource(eventsUrl, sseConfig);
    this.eventSource.addEventListener("newPotentialFire", e => {
      // console.log('UpdateLEID', e.lastEventId);
      this.newPotentialFire(e)
    });
    this.eventSource.addEventListener("closedConnection", e =>
      this.stopUpdates(e)
    );

    // filter potential fires with user specified region of interest
    getUserRegion().then(userRegion => {
      // console.log('userRegion', userRegion);
      this.setState({userRegion: userRegion});
      // check existing potentialFires to see if they are within limits
      if (userRegion.topLat && this.state.potentialFires && this.state.potentialFires.length) {
        const selectedFires = this.state.potentialFires.filter(potFire => this.isFireInRegion(potFire, userRegion));
        if (selectedFires.length !== this.state.potentialFires.length) {
          this.setState({potentialFires: selectedFires});
        }
      }
    });

    // update recent vs. old fires periodically
    setInterval(() => {
      this.updateRecentCounts(this.state.potentialFires);
    }, 30 * 60 * 1000); // check every 30 minutes (long period to reduce energy usage and we don't need high precision)
  }

  stopUpdates(e) {
    console.log('stopUpdates', e);
    this.eventSource.close();
  }

  componentWillUnmount() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null;
    }
  }

  isHorizIntersection(commonLat, leftLong, rightLong, vertices) {
    if (Math.abs(vertices[1][0] - vertices[0][0]) < 0.01) {
      return false; // too close to horizontal -- ignore this segment and see if other segments intersect
    }
    // t1 is parameterized value on ilne segment where 0 represents vertices[0] and 1 represents vertices[1]
    const t1 = (commonLat - vertices[0][0]) / (vertices[1][0] - vertices[0][0]);
    if ((t1 >= 0) && (t1 <= 1)) { // commonLat is between the two vertices
      // now check if intersection point is within leftLong and rightLong
      const intersectionLong = (vertices[1][1] - vertices[0][1]) * t1 + vertices[0][1];
      return ((intersectionLong >= leftLong) && (intersectionLong <= rightLong));
    }
    return false;
  }

  isVertIntersection(commonLong, bottomLat, topLat, vertices) {
    if (Math.abs(vertices[1][1] - vertices[0][1]) < 0.01) {
      return false; // too close to vertical -- ignore this segment and see if other segments intersect
    }
    const t1 = (commonLong - vertices[0][1]) / (vertices[1][1] - vertices[0][1]);
    if ((t1 >= 0) && (t1 <= 1)) { // commonLong is between the two vertices
      // now check if intersection point is within bottomLat and topLat
      const intersectionLat = (vertices[1][0] - vertices[0][0]) * t1 + vertices[0][0];
      return ((intersectionLat >= bottomLat) && (intersectionLat <= topLat));
    }
    return false;
  }

  isFireInRegion(potFire, userRegion) {
    if (!userRegion || !userRegion.topLat || !potFire.polygon) {
      return true; // pass if coordinates are not available
    }
    let minLat = 100;
    let maxLat = 0;
    let minLong = 200;
    let maxLong = -200;
    let vertexInRegion = false;
    potFire.polygon.forEach(vertex => {
      minLat = Math.min(minLat, vertex[0]);
      maxLat = Math.max(maxLat, vertex[0]);
      minLong = Math.min(minLong, vertex[1]);
      maxLong = Math.max(maxLong, vertex[1]);
      if (!vertexInRegion) {
        vertexInRegion = (vertex[0] >= userRegion.bottomLat) && (vertex[0] <= userRegion.topLat) &&
                          (vertex[1] >= userRegion.leftLong) && (vertex[1] <= userRegion.rightLong);
      }
    });
    if (vertexInRegion) { // at least one vertex is inside userRegion
      // console.log('ifir vInR', potFire.cameraID, potFire.polygon);
      return true;
    }
    if ((minLat > userRegion.topLat) || (maxLat < userRegion.bottomLat) ||
        (minLong > userRegion.rightLong) || (maxLong < userRegion.leftLong)) {
          // console.log('ifir out', potFire.cameraID, potFire.polygon);
          return false; // every vertex is on the outside of one edge of userRegion
    }
    // The remaining polygons may have a diagonal edge crossing a corner of the userRegion.
    // Check for intersection between every line segment of polygon with userRegion rectangle
    const intersect = potFire.polygon.find((vertex,i) => {
      const nextVertex = potFire.polygon[ (i+1) % potFire.polygon.length ];
      return this.isHorizIntersection(userRegion.topLat, userRegion.leftLong, userRegion.rightLong, [vertex, nextVertex]) ||
        this.isHorizIntersection(userRegion.bottomLat, userRegion.leftLong, userRegion.rightLong, [vertex, nextVertex]) ||
        this.isVertIntersection(userRegion.leftLong, userRegion.bottomLat, userRegion.topLat, [vertex, nextVertex]) ||
        this.isVertIntersection(userRegion.rightLong, userRegion.bottomLat, userRegion.topLat, [vertex, nextVertex]);
    });
    // console.log('ifir mid', potFire.cameraID, intersect, potFire.polygon);

    // TODO: Even without intersection of line segments, the regions may overlap if polygon completely
    // encapsulates userRegion, but ignoring this possibility for now because assumption is most users
    // select regions at least 10 miles x 10 miles.
    return intersect;
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

    if (!this.isFireInRegion(parsed, this.state.userRegion)) {
      return;
    }

    // next check for duplicate
    const alreadyExists = this.state.potentialFires.find(i =>
       ((i.timestamp === parsed.timestamp) && (i.cameraID === parsed.cameraID)));
    if (alreadyExists) {
      return;
    }

    // now insert new fires at right timeslot and remove old fires
    const updatedFires = [parsed].concat(this.state.potentialFires)
      .sort((a,b) => (b.timestamp - a.timestamp)) // sort by timestamp descending
      .slice(0, 20);  // limit to most recent 20

    this.setState({
      potentialFires: updatedFires,
    });
    this.updateRecentCounts(updatedFires);
  }

  updateRecentCounts(potentialFires) {
    const nowSeconds = Math.round(new Date().valueOf()/1000);
    const earliestTimestamp = nowSeconds - 3600*this.state.hoursLimit;
    const newState = {
      numRecentFires: potentialFires.filter(f => f.timestamp >= earliestTimestamp).length,
      numOldFires: potentialFires.filter(f => f.timestamp < earliestTimestamp).length
    };
    this.setState(newState);
  }

  toggleOldFires() {
    this.setState({showOldFires: !this.state.showOldFires});
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
      const potentialFires = this.state.potentialFires.map(pFire => {
        if ((pFire.cameraID !== potFire.cameraID) || (pFire.timestamp !== potFire.timestamp)) {
          return pFire;
        }
        const updatedFire = Object.assign({}, pFire);
        updatedFire.voted = isRealFire;
        return updatedFire;
      });
      this.setState({potentialFires: potentialFires});
    } else {
      this.props.invalidateCookie();
    }
  }

  render() {
    return (
      <div>
        <h1 className="w3-padding-32 w3-row-padding">
          Potential fires
        </h1>
        <h5>
          There's no need to refresh this page to see new fires because it automatically updates to display new detections.
          Note that the real-time detection is only active during daylight hours in California.
        </h5>
        <p>
          This page shows recent potential fires as detected by the automated system.
          Each potential fire event displays a five minute time-lapse video of portion of the camera image
          where the potential fire was detected.  The last frame of the video highlights the detection
          area in a red rectangle to help people quickly determine if there is a real fire.
          Users intersted in seeting a broader view can see the full camera image by click on the
          "full image" link above each video.
          Each potential fire event display also includes a map with a red shaded triangular region
          highlighting the potential fire region from the video (the map view is an approximation that
          may not reflect the real view from the image).
          The system does generate false notifications, and signed-in users can vote whether system was
          correct or not.  These votes help improve the system over time, so please consider voting.
        </p>
        {
          (this.state.userRegion && this.state.userRegion.topLat) ?
            <h5>
              Only potential fires in selected region are being shown.  To see potential fires across all
              cameras, remove the selection in the <Link to='/chooseArea'>Choose area</Link> page.
            </h5>
          :
            <p>
              Signed-in users can specify their region of interest on the&nbsp;
              {this.props.validCookie? <Link to='/chooseArea'>Choose area</Link>: 'Choose area'}
              &nbsp;page.
              Such users will only see potential fire events that may overlap their chosen area of interest.
            </p>
        }
        {
          (this.state.numRecentFires > 0) ?
            this.state.potentialFires.slice(0, this.state.numRecentFires).map(potFire =>
              <FirePreview key={potFire.annotatedUrl} potFire={potFire}
                childComponent={<VoteButtons validCookie={this.props.validCookie} potFire={potFire}
                                  onVote={(f,v) => this.vote(f,v)} signin={this.props.signin} />}
              />)
        :
            <p>No fire starts detected in last {this.state.hoursLimit} hours.</p>
        }
        {(this.state.numOldFires > 0) &&
          (<div>
            <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> this.toggleOldFires()}>
              {this.state.showOldFires ? 'Hide old fires' : 'Show old fires'}
            </button>
            <div className="w3-padding"></div>
            {this.state.showOldFires && (<div>
              <p>
                Potential fires older than {this.state.hoursLimit} hours
              </p>
              {
                this.state.potentialFires.slice(this.state.numRecentFires).map(potFire =>
                  <FirePreview key={potFire.annotatedUrl} potFire={potFire}
                    childComponent={<VoteButtons validCookie={this.props.validCookie} potFire={potFire}
                                      onVote={(f,v) => this.vote(f,v)} signin={this.props.signin} />}
                  />)
              }
            </div>)}
          </div>)
        }
      </div>
    );
  }
}

export default VoteFires;
