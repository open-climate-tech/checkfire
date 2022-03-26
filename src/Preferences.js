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

// User preferences (Notifications and Choose area of interest by dragging a rectangle over map)

import React, { Component } from "react";
import ResizeObserver from 'react-resize-observer';
import Notification  from "react-web-notification";

import {getServerUrl, serverPost, getUserPreferences} from './OctReactUtils';
import hpwren1078 from './hpwren-1078x638.jpg';
import hpwren1290 from './hpwren-1290x762.jpg';
import hpwren1492 from './hpwren-1492x870.jpg';
const maps = [
  {name: hpwren1492, topLat: 34.79, leftLong: -120.59, bottomLat: 32.42, rightLong: -115.72, pixelWidth: 1492, pixelHeight: 870},
  {name: hpwren1290, topLat: 34.81, leftLong: -120.58, bottomLat: 32.43, rightLong: -115.72, pixelWidth: 1290, pixelHeight: 762},
  {name: hpwren1078, topLat: 34.82, leftLong: -120.60, bottomLat: 32.41, rightLong: -115.72, pixelWidth: 1078, pixelHeight: 638},
];
maps.forEach(mapInfo => {
  mapInfo.longWidth = mapInfo.rightLong - mapInfo.leftLong;
  mapInfo.latHeight = mapInfo.topLat - mapInfo.bottomLat;
});

class Preferences extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mapIndex: 1,
      webNotify: false,
      notifBlocked: false,
    };
  }

  async componentDidMount() {
    // Load and display any earlier saved region from backend
    const preferences = await getUserPreferences()
    this.setState({
      savedRegion: preferences.region,
      webNotify: preferences.webNotify,
    });
    if (!this.state.startX && !this.state.minX) {
      this.showRegion(preferences.region);
    }
  }

  /**
   * Display the given geogrpahicsl region on the map
   * @param {*} region
   */
  showRegion(region) {
    const mapInfo = maps[this.state.mapIndex];
    if (region && region.topLat && this.imgElt && (typeof(this.imgLeft) === 'number')) {
      const topLat = Math.min(Math.max(region.topLat, mapInfo.bottomLat), mapInfo.topLat);
      const bottomLat = Math.min(Math.max(region.bottomLat, mapInfo.bottomLat), mapInfo.topLat);
      const leftLong = Math.min(Math.max(region.leftLong, mapInfo.leftLong), mapInfo.rightLong);
      const rightLong = Math.min(Math.max(region.rightLong, mapInfo.leftLong), mapInfo.rightLong);
      const newState = {
        minX: (leftLong - mapInfo.leftLong)/mapInfo.longWidth*mapInfo.pixelWidth + this.imgLeft,
        minY: (mapInfo.topLat - topLat)/mapInfo.latHeight*mapInfo.pixelHeight + this.imgTop,
        width: (rightLong - leftLong)/mapInfo.longWidth*mapInfo.pixelWidth,
        height: (topLat - bottomLat)/mapInfo.latHeight*mapInfo.pixelHeight,
        startX: null,
        currentRegion: region,
      }
      this.setState(newState);
    }
  }

  /**
   * Save the reference to given DOM element for <img> in order to collect location and size
   * @param {*} e
   */
  saveImgRef(e) {
    if (e) {
      this.imgElt = e;
      this.checkImgLocation();
    }
  }

  /**
   * Find the absolute location and size of the <img> DOM element
   */
  checkImgLocation() {
    if (!this.imgElt) {
      return;
    }
    const bcr = this.imgElt.getBoundingClientRect();
    const left = Math.round(bcr.left + window.scrollX);
    const top = Math.round(bcr.top + window.scrollY);
    const right = Math.round(bcr.right + window.scrollX);
    const bottom = Math.round(bcr.bottom + window.scrollY);
    if ((this.imgLeft !== left) || (this.imgTop !== top) || (this.imgRight !== right) || (this.imgBottom !== bottom)) {
      this.imgLeft = left;
      this.imgTop = top;
      this.imgRight = right;
      this.imgBottom = bottom;
      // console.log('img l,t,r,b', left, top, right, bottom);
      if (this.state.currentRegion) {
        this.showRegion(this.state.currentRegion);
      }
    }
  }

  /**
   * Mouse was clicked, so record the starting point and clear out any old rectangle
   * @param {*} e
   */
  handleMouseDown(e) {
    // console.log('hm down', e.nativeEvent.pageX, e.nativeEvent.pageY);
    if ((e.nativeEvent.pageX > this.imgLeft) && (e.nativeEvent.pageY > this.imgTop) &&
        (e.nativeEvent.pageX < this.imgRight) && (e.nativeEvent.pageY < this.imgBottom)) {
      this.setState({startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY, minX: null});
    }
  }

  /**
   * Mouse drag, so set the locatoin and size of the selected rectangle to match the mouse location
   * @param {*} e
   */
  handleMouseMove(e) {
    if (typeof(this.state.startX) !== 'number') {
      return;
    }
    // console.log('hm move', e.nativeEvent.pageX, e.nativeEvent.pageY);
    const eventX = Math.min(Math.max(e.nativeEvent.pageX, this.imgLeft), this.imgRight);
    const eventY = Math.min(Math.max(e.nativeEvent.pageY, this.imgTop), this.imgBottom);
    const newState = {
      minX: Math.min(this.state.startX, eventX),
      minY: Math.min(this.state.startY, eventY),
    }
    newState.width = Math.max(Math.max(this.state.startX, eventX) - newState.minX, 20);
    newState.height = Math.max(Math.max(this.state.startY, eventY) - newState.minY, 20);
    this.setState(newState);
  }

  /**
   * Mouse drag stopped, so mark it such that mouse moves no longer update selected rectangle
   * @param {*} e
   */
  handleMouseUp(e) {
    // console.log('hm up', e.nativeEvent.pageX, e.nativeEvent.pageY);
    const mapInfo = maps[this.state.mapIndex];
    const region = {};
    region.topLat = mapInfo.topLat - (this.state.minY - this.imgTop)/mapInfo.pixelHeight*mapInfo.latHeight;
    region.bottomLat = region.topLat - this.state.height/mapInfo.pixelHeight*mapInfo.latHeight;
    region.leftLong = mapInfo.leftLong + (this.state.minX - this.imgLeft)/mapInfo.pixelWidth*mapInfo.longWidth;
    region.rightLong = region.leftLong + this.state.width/mapInfo.pixelWidth*mapInfo.longWidth;
    // TODO: ensure box is at least few miles in each dimension
    console.log('box', region.topLat, region.leftLong, region.bottomLat, region.rightLong);
    this.setState({
      startX: null,
      currentRegion: region,
    });
  }

  /**
   * Convert the currently selected rectangle from pixel coordinates to lat/long and
   * make a POST call to backend to save the lat/long coordinates
   */
  async saveRegion() {
    if (this.state.currentRegion && this.state.currentRegion.topLat) {
      const serverUrl = getServerUrl('/api/setRegion');
      const serverRes = await serverPost(serverUrl, this.state.currentRegion);
      console.log('post res', serverRes);
      this.setState({savedRegion: this.state.currentRegion});
    }
  }

  /**
   * Make a POST call to backend to erase saved rectangle.  Also throw out any rectangle on screen
   */
  async removeSelection() {
    const serverUrl = getServerUrl('/api/setRegion');
    const serverRes = await serverPost(serverUrl, {
      topLat: 0, leftLong: 0, bottomLat: 0, rightLong: 0
    });
    console.log('post res', serverRes);
    this.setState({
      startX: null,
      minX: null,
      currentRegion: null,
      savedRegion: null,
    });
  }

  zoomIn() {
    if (this.state.mapIndex > 0) {
      this.setState({mapIndex: this.state.mapIndex - 1});
    }
  }
  zoomOut() {
    if (this.state.mapIndex < (maps.length - 1)) {
      this.setState({mapIndex: this.state.mapIndex + 1});
    }
  }

  // change handler for notifications checkbox
  async handleNotifyChange(event) {
    const target = event.target;
    this.setState({
      webNotify: target.checked
    });
    const serverUrl = getServerUrl('/api/setWebNotify');
    const serverRes = await serverPost(serverUrl, {webNotify: target.checked});
    console.log('post res', serverRes);
  }

  // notifications permission granted by user
  notifGranted() {
    this.setState({notifBlocked: false});
  }
  // notifications permission denied by user
  notifDenied() {
    this.setState({notifBlocked: true});
  }

  render() {
    return (
      <div>
        <h1>
          Preferences
        </h1>
        {
          this.props.validCookie ?
          (<div>
            <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
              <h3>
                Notifications
              </h3>
              <div>
                <p>
                  Check the below if you want to see notifications on your device whenever
                  new potential fire events are discovered.  Note the browser may ask you to
                  allow showing notifications.  Also note that the notifications are only shown
                  when this site is not running in the foreground.
                </p>
                Notifications <input type="checkbox" id="webNotify" name="webNotify"
                  checked={this.state.webNotify} onChange={e => this.handleNotifyChange(e)}>
                </input>
                {this.state.webNotify && (
                  <Notification
                    onPermissionGranted={() => this.notifGranted()}
                    onPermissionDenied={() => this.notifDenied()}
                    title=''
                  />
                )}
                {this.state.webNotify && this.state.notifBlocked && (
                  <p>
                    Notifications are blocked by your browser.  Please change settings if you want notifications.
                  </p>
                )}
              </div>
            </div>
            <div className="w3-padding"></div>
            <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
              <h3>
                Choose region of interest
              </h3>
              <p>
                Mark (click and drag) a rectangle on top of the map below to select the geographical region
                where you are interested in monitoring potential fires.  You can restart anytime by marking
                a new rectangle.  When satisfied, click the Save button below the map.
              </p>
              <p>
                The red dots show the location of the cameras, and partially shaded red circles around each
                dot represent a 20 mile radius circlular region that should be visible from each camera location.
                Actual visible area depends on terrain occlusions and atmospheric visibility conditions.
              </p>
              <div
                onMouseDown={e => this.handleMouseDown(e)}
                onMouseUp={e => this.handleMouseUp(e)}
                onMouseMove={e => this.handleMouseMove(e)}
              >
                <ResizeObserver
                  onReflow={r=>this.checkImgLocation(r)}
                />
                <img src={maps[this.state.mapIndex].name} alt="Map" draggable={false}
                  ref={e => this.saveImgRef(e)}
                />
                {this.state.minX && (
                  <div style={{zIndex: 10, position: 'absolute',
                    left: this.state.minX + 'px', top: this.state.minY + 'px',
                    width: this.state.width + 'px', height: this.state.height + 'px',
                    backgroundColor: 'transparent', border: '1px solid blue'}}
                  >
                  </div>
                )}
              </div>
              <div className="w3-padding">
                <button className={"w3-button w3-border w3-round-large w3-black" + ((this.state.mapIndex === 0) ? " w3-disabled" : "")}
                  onClick={()=> this.zoomIn()}>Zoom in</button>
                <button className={"w3-button w3-border w3-round-large w3-black" + ((this.state.mapIndex === (maps.length - 1)) ? " w3-disabled" : "")}
                  onClick={()=> this.zoomOut()}>Zoom out</button>
              </div>
              <div className="w3-padding">
                <button className={"w3-button w3-border w3-round-large w3-black" + (this.state.minX ? "" : " w3-disabled")}
                  onClick={()=> this.saveRegion()}>
                  Save selected region
                </button>
                <button className={"w3-button w3-border w3-round-large w3-black" +
                                    ((this.state.savedRegion && this.state.savedRegion.topLat) ? "" : " w3-disabled")}
                  onClick={()=> this.showRegion(this.state.savedRegion)}>
                  Restore saved region
                </button>
                <button className="w3-button w3-border w3-round-large w3-black"
                  onClick={()=> this.removeSelection()}>
                  Remove selection
                </button>
              </div>
            </div>
            <div className="w3-padding"></div>
          </div>)
          :
          (<p>
              Sign in above to store your preferred area.
          </p>)
        }
      </div>
    );
  }
}

export default Preferences;
