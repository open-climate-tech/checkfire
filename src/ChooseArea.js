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

// Choose area of interest by dragging a rectangle over map

import React, { Component } from "react";
import ResizeObserver from 'react-resize-observer';

import {getServerUrl, serverGet, serverPost} from './OctReactUtils';
import hpwren20 from './hpw-20.jpg';
const mapTopLat = 34.918;
const mapLeftLong = -120.675;
const mapBottomLat = 32.489;
const mapRightLong = -115.259
const mapLongWidth = mapRightLong - mapLeftLong;
const mapLatHeight = mapTopLat - mapBottomLat;
const mapPixelWidth = 2396;
const mapPixelHeight = 1294;

class ChooseArea extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    // Load and display any earlier saved region from backend
    const serverUrl = getServerUrl('/api/getRegion');
    const resp = await serverGet(serverUrl);
    const existingRegion = await resp.json();
    this.setState({existingRegion: existingRegion});
    if (!this.state.startX && !this.state.minX) {
      this.showRegion(existingRegion);
    }
  }

  /**
   * Display the given geogrpahicsl region on the map
   * @param {*} region
   */
  showRegion(region) {
    if (region.topLat && this.imgElt && (typeof(this.imgLeft) === 'number')) {
      const topLat = Math.min(Math.max(region.topLat, mapBottomLat), mapTopLat);
      const bottomLat = Math.min(Math.max(region.bottomLat, mapBottomLat), mapTopLat);
      const leftLong = Math.min(Math.max(region.leftLong, mapLeftLong), mapRightLong);
      const rightLong = Math.min(Math.max(region.rightLong, mapLeftLong), mapRightLong);
      const newState = {
        minX: (leftLong - mapLeftLong)/mapLongWidth*mapPixelWidth + this.imgLeft,
        minY: (mapTopLat - topLat)/mapLatHeight*mapPixelHeight + this.imgTop,
        width: (rightLong - leftLong)/mapLongWidth*mapPixelWidth,
        height: (topLat - bottomLat)/mapLatHeight*mapPixelHeight,
        startX: null,
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
    const pageX = Math.round(bcr.left + window.scrollX);
    const pageY = Math.round(bcr.top + window.scrollY);
    if ((this.imgLeft !== pageX) || (this.imgTop !== pageY)) {
      this.imgLeft = pageX;
      this.imgTop = pageY;
      console.log('img pageXY', pageX, pageY);
    }
  }

  /**
   * Mouse was clicked, so record the starting point and clear out any old rectangle
   * @param {*} e
   */
  handleMouseDown(e) {
    // console.log('hm down', e.nativeEvent.pageX, e.nativeEvent.pageY);
    this.setState({startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY, minX: null});
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
    const newState = {
      minX: Math.min(this.state.startX, e.nativeEvent.pageX),
      minY: Math.min(this.state.startY, e.nativeEvent.pageY),
    }
    newState.width = Math.max(this.state.startX, e.nativeEvent.pageX) - newState.minX;
    newState.height = Math.max(this.state.startY, e.nativeEvent.pageY) - newState.minY;
    this.setState(newState);
  }

  /**
   * Mouse drag stopped, so mark it such that mouse moves no longer update selected rectangle
   * @param {*} e
   */
  handleMouseUp(e) {
    // console.log('hm up', e.nativeEvent.pageX, e.nativeEvent.pageY);
    this.setState({startX: null});
  }

  /**
   * Convert the currently selected rectangle from pixel coordinates to lat/long and
   * make a POST call to backend to save the lat/long coordinates
   */
  async saveRegion() {
    const region = {};
    region.topLat = mapTopLat - (this.state.minY - this.imgTop)/mapPixelHeight*mapLatHeight;
    region.bottomLat = region.topLat - this.state.height/mapPixelHeight*mapLatHeight;
    region.leftLong = mapLeftLong + (this.state.minX - this.imgLeft)/mapPixelWidth*mapLongWidth;
    region.rightLong = region.leftLong + this.state.width/mapPixelWidth*mapLongWidth;
    console.log('box', region.topLat, region.leftLong, region.bottomLat, region.rightLong);
    // TODO: ensure box is at least few miles in each dimension
    const serverUrl = getServerUrl('/api/setRegion');
    const serverRes = await serverPost(serverUrl, region);
    console.log('post res', serverRes);
    this.setState({existingRegion: region});
  }

  /**
   * Make a POST call to backend to erase saved rectangle.  Also throw out any rectangle on screen
   */
  async removeSelection() {
    const serverUrl = getServerUrl('/api/setRegion');
    const serverRes = await serverPost(serverUrl, {
      topLat: 1, leftLong: 1, bottomLat: 1, rightLong: 1
    });
    console.log('post res', serverRes);
    this.setState({
      startX: null,
      minX: null,
      existingRegion: null,
    });
  }

  render() {
    return (
      <div>
        <h1>
          Choose region of interest
        </h1>
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
          <img src={hpwren20} alt="Map" draggable={false}
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
        {
          (this.state.minX ?
            <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> this.saveRegion()}>
              Save selected region
            </button>
          :
            <button className="w3-button w3-border w3-round-large w3-black w3-disabled">
              Save selected region
            </button>
          )
        }
        {
          ((this.state.existingRegion && this.state.existingRegion.topLat) ?
            <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> this.showRegion(this.state.existingRegion)}>
              Restore saved region
            </button>
          :
            <button className="w3-button w3-border w3-round-large w3-black w3-disabled">
              Restore saved region
            </button>
          )
        }
        <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> this.removeSelection()}>
          Remove selection
        </button>
      </div>
    );
  }
}

export default ChooseArea;
