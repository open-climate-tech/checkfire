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
import Notification  from "react-web-notification";

import {getServerUrl, serverPost, getUserPreferences, FirePreview, VoteButtons} from './OctReactUtils';

class VoteFires extends Component {
  constructor(props) {
    super(props);
    this.state = {
      potentialFires: [],
      hoursLimit: 2, // 2 hours
      numRecentFires: 0,
      numOldFires: 0,
      showOldFires: false,
      showDetails: false,
      webNotify: false,
      notifyTitle: '',
      notifyOptions: '',
      locationID: null,
    };
    this.sseVersion = null;
  }

  componentDidMount() {
    const queryParams = new URLSearchParams(window.location.search)
    const locationID = queryParams.get('locID');
    const latLongStr = queryParams.get('latLong');
    const notifyStr = queryParams.get('notify');
     // lat/long for northern (> 10 latitude) and western (<-100) longitude
    const twoPointOne = '([0-9]{2}(?:\\.[0-9])?)';
    const negThreePointOne = '(-[0-9]{3}(?:\\.[0-9])?)';
    const regexLatLong = RegExp('^' + twoPointOne + ',' + twoPointOne + ',' + negThreePointOne + ',' + negThreePointOne + '$')
    const latLongParsed = regexLatLong.exec(latLongStr);
    let userRegion = null;
    if (latLongParsed) {
      userRegion = {
        bottomLat: parseFloat(latLongParsed[1]),
        topLat: parseFloat(latLongParsed[2]),
        leftLong: parseFloat(latLongParsed[3]),
        rightLong: parseFloat(latLongParsed[4]),
      }
      // basic lat/long verification for northern and western hemispheres
      // also verify degree difference of at least 0.3
      if (userRegion.topLat > 90 || userRegion.bottomLat > 90 || userRegion.topLat < (userRegion.bottomLat + 0.3) ||
        userRegion.leftLong < -180 || userRegion.rightLong < -180 || userRegion.rightLong < (userRegion.leftLong + 0.3)) {
          userRegion = null;
        }
    }
    let webNotifyQP = false;
    if (notifyStr && (notifyStr === 'true' || notifyStr === 'false')) {
      webNotifyQP = notifyStr === 'true'
    }
    this.setState({
      locationID: locationID,
      userRegion: userRegion,
      webNotify: webNotifyQP || Boolean(locationID), // locationID queryParams automatically enable notifications
    });

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
    getUserPreferences().then(preferences => {
      // console.log('preferences', preferences);
      if (!userRegion || !latLongStr) {
        userRegion = preferences.region;
      }
      this.setState({
        userRegion: userRegion,
        webNotify: notifyStr ? webNotifyQP : (preferences.webNotify || Boolean(locationID)),
        showProto: preferences.showProto,
      });
      // check existing potentialFires to see if they are within limits
      if (userRegion.topLat && this.state.potentialFires && this.state.potentialFires.length) {
        const selectedFires = this.state.potentialFires.filter(potFire => this.isFireInRegion(potFire, userRegion));
        if (selectedFires.length !== this.state.potentialFires.length) {
          this.updateFiresAndCounts(selectedFires);
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
    // t1 is parameterized value on line segment where 0 represents vertices[0] and 1 represents vertices[1]
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
    if (this.state.locationID && !potFire.cameraID.startsWith(this.state.locationID + '-')) {
      return false;
    }

    if (!userRegion || !userRegion.topLat || !potFire.polygon) {
      return true; // pass if coordinates are not available
    }
    // min/max lat/long for northern and western hemispheres
    let minLat = 90;
    let maxLat = 0;
    let minLong = 0;
    let maxLong = -180;
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
    this.clearNotification();
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

    // check for duplicates, updates to existing fires, or new fires
    const alreadyExists = this.state.potentialFires.find(i =>
       ((i.timestamp === parsed.timestamp) && (i.cameraID === parsed.cameraID)));
    if (alreadyExists) {
      if (alreadyExists.croppedUrl === parsed.croppedUrl) { // exact same, so ignore
        return;
      } else { // new video on existing fire, so update existing entry
        alreadyExists.croppedUrl = parsed.croppedUrl;
        console.log('newPotentialFire: diff cropped', parsed.croppedUrl);
        this.updateFiresAndCounts(this.state.potentialFires);
      }
    } else { // new fire
      // now insert new fires at right timeslot and remove old fires
      const updatedFires = [parsed].concat(this.state.potentialFires)
        .sort((a,b) => (b.sortId - a.sortId)) // sort by sortId descending
        .slice(0, 20);  // limit to most recent 20

      // if this is a new real-time fire, and notifications are enabled, trigger notification
      const newTop = updatedFires.length ? updatedFires[0] : {};
      if (newTop && newTop.isRealTime && this.state.webNotify && (newTop.timestamp === parsed.timestamp) && (newTop.cameraID === parsed.cameraID)) {
        this.notify(updatedFires);
      }
      this.updateFiresAndCounts(updatedFires);
    }
  }

  calculateRecentCounts(potentialFires) {
    const nowSeconds = Math.round(new Date().valueOf()/1000);
    const earliestTimestamp = nowSeconds - 3600*this.state.hoursLimit;
    const counts = {
      numRecentFires: potentialFires.filter(f => f.timestamp >= earliestTimestamp).length,
      numOldFires: potentialFires.filter(f => f.timestamp < earliestTimestamp).length
    };
    return counts;
  }

  updateRecentCounts(potentialFires) {
    const newState = this.calculateRecentCounts(potentialFires);
    this.setState(newState);
  }

  updateFiresAndCounts(potentialFires) {
    const newState = this.calculateRecentCounts(potentialFires);
    newState.potentialFires = potentialFires;
    this.setState(newState);
  }

  toggleOldFires() {
    this.setState({showOldFires: !this.state.showOldFires});
  }

  toggleDetails() {
    this.setState({showDetails: !this.state.showDetails});
  }

  clearNotification() {
    this.setState({notifyTitle: ''});
  }

  notify(updatedFires) {
    const newFire = updatedFires[0]
    if (newFire.notified || !newFire.isRealTime) {
      console.log('Assumption violation: first fire should be realtime and not notified');
      return;
    }
    const NOTIFY_GAP_MIN_SECONDS = 30;
    const NOTIFY_MAX_RECENT_NOTIFICAIONS = 2;
    const NOTIFY_MAX_RECENT_MINUTES = 5;
    const notifiedFires = updatedFires.filter(x => x.isRealTime && x.notified);
    const mostRecentNotification = notifiedFires[0] ? notifiedFires[0].timestamp : 0;
    // prevent spam with frequency thresholds
    // at leaset NOTIFY_GAP_MIN_SECONDS seconds between notifications
    if ((newFire.timestamp - mostRecentNotification) < NOTIFY_GAP_MIN_SECONDS) {
      return;
    }
    // at most NOTIFY_MAX_FIRES every NOTIFY_MAX_MINUTES minutes
    const timeThreshold = newFire.timestamp - NOTIFY_MAX_RECENT_MINUTES*60;
    const recentNotifiedFires = notifiedFires.filter(x => x.timestamp > timeThreshold)
    if (recentNotifiedFires.length > NOTIFY_MAX_RECENT_NOTIFICAIONS) {
      return;
    }
    newFire.notified = true;
    this.setState({
      notifyTitle: 'Potential fire',
      notifyOptions: {
        tag: newFire.timestamp.toString(),
        body: `Camera ${newFire.camInfo.cameraName} facing ${newFire.camInfo.cameraDir}`,
        icon: '/wildfirecheck/checkfire192.png',
        lang: 'en',
      }
    });
  }

  async vote(potFire, voteType) {
    const serverUrl = getServerUrl((voteType === 'undo') ? '/api/undoVoteFire' : '/api/voteFire');
    const serverRes = await serverPost(serverUrl, {
      cameraID: potFire.cameraID,
      timestamp: potFire.timestamp,
      isRealFire: voteType === 'yes'
    });
    console.log('post res', serverRes);
    if (serverRes === 'success') {
      const potentialFires = this.state.potentialFires.map(pFire => {
        if ((pFire.cameraID !== potFire.cameraID) || (pFire.timestamp !== potFire.timestamp)) {
          return pFire;
        }
        const updatedFire = Object.assign({}, pFire);
        if (voteType === 'undo') {
          delete updatedFire.voted;
        } else {
          updatedFire.voted = (voteType === 'yes');
        }
        return updatedFire;
      });
      this.setState({potentialFires: potentialFires});
    } else {
      window.location.reload();
    }
  }

  render() {
    return (
      <div>
        <span>
          <h1>
            WildfireCheck: Potential fires
          </h1>
          <p>
            Please note that this site does not alert the fire authorities directly.
            If you discover a real fire that recently ignited,
            consider informing the fire department to take appropriate action.
          </p>
          <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> this.toggleDetails()}>
            {this.state.showDetails ? 'Hide description' : 'Show description'}
          </button>
        </span>
        {this.state.showDetails &&
          <div>
            <p>
              There's no need to refresh this page to see new fires because it automatically updates to display
              new detections. Note that the real-time detection is only active during daylight hours in California.
            </p>
            <p>
              This page shows recent potential fires as detected by the automated system.
              Each event displays a time-lapse video starting a few minutes prior to the detection.
              The video updates automatically for a few minutes after.
              The video shows a portion of the images near the suspected location of fire smoke (highlighted by a rectangle).
              The rectangle is colored yellow on images prior to the detection and colored red afterwards.
              To see a broader view for more context, click on the "Full image" link above the video.
            </p>
            <p>
              Each potential fire event display also includes a map showing the view area visible from the time-lapse video
              highlighted by a red triangle.
              When multiple cameras detect the same event, the intersection of all the triangles is highlighted in purple.
              The map also depicts any known prescribed burns using an icon with flames and a red cross.
            </p>
            <p>
              The system does generate false notifications, and signed-in users can vote whether system was
              correct or not.  These votes help improve the system over time, so please consider voting.
            </p>
          </div>
        }
        {
          this.state.locationID ?
            <h5>
              Only potential fires from camera location <strong>{this.state.locationID}</strong> are being shown.
            </h5>
          : ((this.state.userRegion && this.state.userRegion.topLat) ?
              <h5>
                Only potential fires in selected region are being shown.  To see potential fires across all
                cameras, remove the selection in the <Link to='/preferences'>Preferences</Link> page.
              </h5>
            :
              <p>
                Potential fires across all areas are being shown. Users can restrict potential fires to their
                specified region of interest on the <Link to='/preferences'>Preferences</Link> page
              </p>
            )
        }
        {(!this.state.webNotify) && (
          <p>
            Users can choose to get notifications in real-time as new potential fire events are detected by
            selecting the option in the <Link to='/preferences'>Preferences</Link> page.
          </p>
        )}
        {this.state.webNotify && (
          <Notification
          ignore={this.state.notifyTitle === ''}
          disableActiveWindow={true}
          title={this.state.notifyTitle}
          options={this.state.notifyOptions}
          />
        )}
        {
          (this.state.numRecentFires > 0) ?
            this.state.potentialFires.slice(0, this.state.numRecentFires).map(potFire =>
              <FirePreview key={potFire.annotatedUrl} potFire={potFire} showProto={this.state.showProto}
                childComponent={<VoteButtons validCookie={this.props.validCookie} potFire={potFire}
                                  onVote={(f,v) => this.vote(f,v)} />}
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
                  <FirePreview key={potFire.annotatedUrl} potFire={potFire} showProto={this.state.showProto}
                    childComponent={<VoteButtons validCookie={this.props.validCookie} potFire={potFire}
                                      onVote={(f,v) => this.vote(f,v)} />}
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
