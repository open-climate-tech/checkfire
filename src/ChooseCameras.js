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

import hpwren20 from './hpw-20.jpg';
const mapLeftLong = -120.675;
const mapTopLat = 34.918;
const mapLongWidth = 5.416;
const mapLatHeight = 2.429;
const mapPixelWidth = 2396;
const mapPixelHeight = 1294;

class ChooseCameras extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  handleMouseDown(e) {
    // console.log('hm down', e.nativeEvent.pageX, e.nativeEvent.pageY);
    this.setState({startX: e.nativeEvent.pageX, startY: e.nativeEvent.pageY, minX: null});
  }

  handleMouseUp(e) {
    // console.log('hm up', e.nativeEvent.pageX, e.nativeEvent.pageY);
    this.setState({startX: null});
    const topLat = mapTopLat - (this.state.minY - this.imgTop)/mapPixelHeight*mapLatHeight;
    const bottomLat = topLat - this.state.height/mapPixelHeight*mapLatHeight;
    const leftLong = mapLeftLong + (this.state.minX - this.imgLeft)/mapPixelWidth*mapLongWidth;
    const rightLong = leftLong + this.state.width/mapPixelWidth*mapLongWidth;
    console.log('box', topLat, leftLong, bottomLat, rightLong);
    // TODO: ensure box is at least few miles in each dimension
  }

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

  imgRef(e) {
    if (e) {
      this.imgElt = e;
      this.checkImgLocation();
    }
  }

  render() {
    return (
      <div>
        <h1>
          Choose Area of Interest
        </h1>
        <p>
          Mark (click and drag) a rectangle on top of the map below to select the geographical area
          where you are interested in monitoring potential fires.  The red dots show the location of
          the cameras, and red circles around each dot represent a 20 mile radius circlular region
          that should be visible from each camera location.
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
            // height={1294} width={2396}
            ref={e => this.imgRef(e)}
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
      </div>
    );
  }
}

export default ChooseCameras;
