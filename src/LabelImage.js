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

// Label iamges with bounding boxes of smoke

import React, { Component } from "react";
import ResizeObserver from 'react-resize-observer';
import DateTimePicker from 'react-datetime-picker';
import Select from 'react-dropdown-select';
import ReactDOM from 'react-dom';

import {getServerUrl, serverGet, serverPost, Legalese} from './OctReactUtils';

class LabelImage extends Component {
  constructor(props) {
    super(props);
    this.eltRefs = {};
    this.state = {
      cameraOptions: [],
      imageUrl: null,
      imageMsg: 'Select camera, date, and time and push button to fetch an image with potential smoke',
      cameraID: null,
      dateTimeVal: null,
      notes: '',
    };
  }

  async componentDidMount() {
    document.addEventListener("keydown", this.keyDown);

    const serverUrl = getServerUrl('/api/listCameras');
    const serverRes = await serverGet(serverUrl);
    if (serverRes.status === 200) {
      const serverResJson = await serverRes.json();
      console.log('List cameras', serverRes.status, serverResJson);
      if (serverResJson) {
        this.setState({cameraOptions: serverResJson.map(cameraID => ({value: cameraID, label: cameraID}))});
      } else {
        this.setState({imageMsg: 'Failed to get cameras.  Try reloading.'});
      }
    } else {
      const serverResText = await serverRes.text();
      console.log('ListCameras response', serverRes.status, serverResText);
      this.setState({imageMsg: 'Error: ' + serverRes.status + ': ' + serverResText});
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyDown);
  }

  /**
   * Save the reference to given DOM element
   * @param {string} type
   * @param {*} element
   */
  saveRef(type, element) {
    if (element) {
      this.eltRefs[type] = element;
      if (type === 'img') {
        this.checkImgLocation();
      }
    }
  }

  /**
   * Find the absolute location and size of the <img> DOM element
   */
  checkImgLocation() {
    if (!this.eltRefs['img']) {
      return;
    }
    this.imgNaturalWidth = this.eltRefs['img'].naturalWidth;
    this.imgNaturalHeight = this.eltRefs['img'].naturalHeight;
    const bcr = this.eltRefs['img'].getBoundingClientRect();
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
    newState.width = Math.max(Math.max(this.state.startX, eventX) - newState.minX, 5);
    newState.height = Math.max(Math.max(this.state.startY, eventY) - newState.minY, 5);
    // console.log('hm move ns', newState);
    this.setState(newState);
  }

  /**
   * Mouse drag stopped, so mark it such that mouse moves no longer update selected rectangle
   * @param {*} e
   */
  handleMouseUp(e) {
    // console.log('hm up', e.nativeEvent.pageX, e.nativeEvent.pageY);
    const newState = {
      startX: null
    };
    if (this.state.minX) {
      const imgWidth = this.imgRight - this.imgLeft;
      const imgHeight = this.imgBottom - this.imgTop;
      const region = {
        left: Math.round((this.state.minX - this.imgLeft)/imgWidth*this.imgNaturalWidth),
        top: Math.round((this.state.minY - this.imgTop)/imgHeight*this.imgNaturalHeight),
      };
      region.right = region.left + Math.round(this.state.width/imgWidth*this.imgNaturalWidth);
      region.bottom = region.top + Math.round(this.state.height/imgHeight*this.imgNaturalHeight);
      console.log('box', region.left, region.top, region.right, region.bottom);
      newState.currentRegion = region;
    }
    this.setState(newState);
  }

  /**
   * Display the bounding box region on image
   * @param {*} region
   */
  showRegion(region) {
    if (region && region.left && this.eltRefs['img'] && (typeof(this.imgLeft) === 'number')) {
      const imgWidth = this.imgRight - this.imgLeft;
      const imgHeight = this.imgBottom - this.imgTop;
      const newState = {
        minX: region.left/this.imgNaturalWidth*imgWidth + this.imgLeft,
        minY: region.top/this.imgNaturalHeight*imgHeight + this.imgTop,
        width: (region.right - region.left)/this.imgNaturalWidth*imgWidth,
        height: (region.bottom - region.top)/this.imgNaturalHeight*imgHeight,
        startX: null,
        currentRegion: region,
      }
      this.setState(newState);
    }
  }

  changeCameraID(value) {
    this.setState({cameraID: value});
  }

  changeDateTime(value) {
    this.setState({dateTimeVal: value});
  }

  changeNotes(event) {
    this.setState({notes: event.target.value})
  }

  /**
   * Fetch an image of currently selected camera and date/time after adding timeOffsetSec
   * @param {Number} timeOffsetSec
   */
  async fetchImage(timeOffsetSec=0) {
    if (!this.state.dateTimeVal || !this.state.cameraID || !this.state.cameraID.length) {
      return;
    }
    const cameraID = this.state.cameraID[0].value;
    const updatedTimeValue = this.state.dateTimeVal.valueOf() + timeOffsetSec*1000;
    const dateISO = new Date(updatedTimeValue).toISOString();
    this.setState({
      imageMsg: 'Fetching image.  Should appear soon if found',
    });
    console.log('Fetch', cameraID, dateISO);
    const direction = (timeOffsetSec > 0) ? 'positive' :
                        ((timeOffsetSec < 0) ? 'negative' : '');
    const urlComponents = [
      'cameraID=' + encodeURIComponent(cameraID),
      'dateTime=' + encodeURIComponent(dateISO),
      'direction=' + encodeURIComponent(direction),
    ];
    const relativeUrl = '/api/fetchImage?' + urlComponents.join('&');
    const serverUrl = getServerUrl(relativeUrl);
    const serverRes = await serverGet(serverUrl);
    if (serverRes.status === 200) {
      const serverResJson = await serverRes.json();
      console.log('FetchImage response', serverRes.status, serverResJson);
      if (serverResJson && serverResJson.imageUrl) {
        this.setState({
          imageUrl: serverResJson.imageUrl,
          imageName: serverResJson.imageName,
          dateTimeVal: new Date(serverResJson.imageTime),
          imageMsg: null,
          startX: null,
          minX: null,
          currentRegion: null,
        });
      } else {
        this.setState({
          imageUrl: null,
          imageMsg: 'Image could not be found.  Select a different camera, date, or time.',
        });
      }
    } else {
      const serverResText = await serverRes.text();
      console.log('FetchImage response', serverRes.status, serverResText);
      this.setState({
        imageUrl: null,
        imageMsg: 'Error: ' + serverRes.status + ': ' + serverResText,
      });
    }
  }

  /**
   * Install keyboard shortcuts for directional arrow keys and 's' for saving bounding box
   * @param {*} e
   */
  keyDown = e => {
    if (!this.eltRefs.cameraPicker || !this.eltRefs.dateTimePicker || !this.eltRefs.notes) {
      return;
    }
    const cpDom = ReactDOM.findDOMNode(this.eltRefs.cameraPicker);
    const dtpDom = ReactDOM.findDOMNode(this.eltRefs.dateTimePicker);
    const notesDom = ReactDOM.findDOMNode(this.eltRefs.notes);
    if (!cpDom || !dtpDom || !notesDom) {
      return;
    }
    const inputsInFocus = cpDom.contains(document.activeElement) || dtpDom.contains(document.activeElement) || notesDom.contains(document.activeElement);
    // console.log('inputsInFocus', inputsInFocus);
    if (inputsInFocus) { // avoid interference with inputs and keyboard shortcuts
      return;
    }
    const keyCodeToOffset = {
      38: 10, // 'up'
      40: -10, // 'down'
      37: -1, // 'left'
      39: 1, // 'right'
    };
    const timeOffsetMin = keyCodeToOffset[e.keyCode];
    // console.log('key', e.keyCode, timeOffsetMin);
    if (timeOffsetMin && this.state.imageUrl && this.state.dateTimeVal) {
      this.fetchImage(timeOffsetMin * 60);
    } else if (e.keyCode === 83) { // 's' shortcut for save
      this.saveAndAdvance();
    }
  }

  /**
   * Save the currently selected bounding box and advance the image by 1 minute
   */
  async saveAndAdvance() {
    if (this.state.currentRegion && this.state.currentRegion.left) {
      const postParams = {
        fileName: this.state.imageName,
        minX: this.state.currentRegion.left,
        minY: this.state.currentRegion.top,
        maxX: this.state.currentRegion.right,
        maxY: this.state.currentRegion.bottom,
        notes: this.state.notes,
      };
      const serverUrl = getServerUrl('/api/setBbox');
      const serverRes = await serverPost(serverUrl, postParams);
      console.log('setBbox respose', serverRes);
      if (serverRes === 'success') {
        this.fetchImage(60);
      } else {
        this.setState({
          imageMsg: 'Failed to save bounding box.  Please reload the page and retry. If the problem persits, notify administrator',
        })
      }
    }
  }

  render() {
    return (
      <div>
        <h1>
          Label images
        </h1>
        <Legalese/>
        {
          this.props.validCookie ?
          (<div>
            <div className="" >
              <Select ref={e => this.saveRef('cameraPicker', e)} className="w3-col s4 w3-margin-left"
                value={this.state.cameraID} onChange={v => this.changeCameraID(v)} options={this.state.cameraOptions}
              />
              <DateTimePicker ref={e => this.saveRef('dateTimePicker', e)} className="w3-col s4 w3-margin-left"
                onChange={v => this.changeDateTime(v)} value={this.state.dateTimeVal} />
              <button className={"w3-button w3-border w3-round-large w3-black w3-margin-left" +
                                  ((this.state.dateTimeVal && this.state.cameraID) ? "" : " w3-disabled")}
                onClick={()=> this.fetchImage()}>
                Fetch image
              </button>
            </div>
            <div className="w3-bar w3-padding">
              {this.state.imageMsg ? this.state.imageMsg : <span>&nbsp;</span>}
            </div>
            {this.state.imageUrl && (
              <div className="w3-bar w3-padding">
                <p>
                  Mark (click and drag) a rectangle on top of the image below to select the
                  bounding box around the visible smoke in the image.
                  You can restart anytime by marking a new rectangle.
                  When satisfied, click the Save button below the image (or press 's' key).
                  The arrow keys are keyboard shortcuts for moving image forward and backward in time.
                  Left/Right arrow keys move time by 1 minute.
                  Up/Down arrow keys move time by 10 minutes.
                </p>
                <div
                  onMouseDown={e => this.handleMouseDown(e)}
                  onMouseUp={e => this.handleMouseUp(e)}
                  onMouseMove={e => this.handleMouseMove(e)}
                >
                  <ResizeObserver
                    onReflow={r=>this.checkImgLocation(r)}
                  />
                  <img src={this.state.imageUrl} alt="Scene with possible smoke" draggable={false}
                    width="100%;"
                    ref={e => this.saveRef('img', e)}
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
                  <label>
                    Notes (optional - please enter 'test' when testing):
                    <input type="text" ref={e => this.saveRef('notes', e)} className="w3-margin-left"
                      value={this.state.notes} onChange={e => this.changeNotes(e)} />
                  </label>
                </div>
                <div className="w3-padding">
                  <button className={"w3-button w3-border w3-round-large w3-black" + (this.state.minX ? "" : " w3-disabled")}
                    onClick={()=> this.saveAndAdvance()}>
                    Save smoke bounding box and advance to next image (keyboard shortcut 's')
                  </button>
                  <button className="w3-button w3-border w3-round-large w3-black"
                    onClick={()=> this.fetchImage(60)}>
                    Discard bounding box (if any) and advance to next image (keyboard shortcut right arrow key)
                  </button>
                </div>
                <div className="w3-padding"></div>
              </div>
            )}
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

export default LabelImage;
