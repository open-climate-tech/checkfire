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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ResizeObserver from 'react-resize-observer';
import DateTimePicker from 'react-datetime-picker';
import Select from 'react-dropdown-select';

import { getServerUrl, serverGet, serverPost } from './OctReactUtils';

function LabelImage(props) {
  const [cameraOptions, setCameraOptions] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageName, setImageName] = useState(null);
  const [imageMsg, setImageMsg] = useState(
    'Select camera, date, and time and push button to fetch an image with potential smoke'
  );
  const [cameraID, setCameraID] = useState(null);
  const [dateTimeVal, setDateTimeVal] = useState(null);
  const [notes, setNotes] = useState('');
  const [startX, setStartX] = useState(null);
  const [startY, setStartY] = useState(null);
  const [minX, setMinX] = useState(null);
  const [minY, setMinY] = useState(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [currentRegion, setCurrentRegion] = useState(null);

  // Refs to DOM elements and image geometry
  const eltRefs = useRef({});
  const imgGeom = useRef({
    naturalWidth: 0,
    naturalHeight: 0,
    left: null,
    top: null,
    right: null,
    bottom: null,
  });

  // Refs to current state for use inside keydown handler (registered once)
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      startX,
      minX,
      minY,
      width,
      height,
      cameraID,
      dateTimeVal,
      imageUrl,
      imageName,
      notes,
      currentRegion,
    };
  });

  /**
   * Display the bounding box region on image
   */
  const showRegion = useCallback((region) => {
    const g = imgGeom.current;
    if (
      region &&
      typeof region.left === 'number' &&
      typeof region.top === 'number' &&
      typeof region.right === 'number' &&
      typeof region.bottom === 'number' &&
      eltRefs.current['img'] &&
      typeof g.left === 'number'
    ) {
      const imgWidth = g.right - g.left;
      const imgHeight = g.bottom - g.top;
      setMinX((region.left / g.naturalWidth) * imgWidth + g.left);
      setMinY((region.top / g.naturalHeight) * imgHeight + g.top);
      setWidth(((region.right - region.left) / g.naturalWidth) * imgWidth);
      setHeight(((region.bottom - region.top) / g.naturalHeight) * imgHeight);
      setStartX(null);
      setCurrentRegion(region);
    }
  }, []);

  const checkImgLocation = useCallback(() => {
    if (!eltRefs.current['img']) {
      return;
    }
    const img = eltRefs.current['img'];
    imgGeom.current.naturalWidth = img.naturalWidth;
    imgGeom.current.naturalHeight = img.naturalHeight;
    const bcr = img.getBoundingClientRect();
    const left = Math.round(bcr.left + window.scrollX);
    const top = Math.round(bcr.top + window.scrollY);
    const right = Math.round(bcr.right + window.scrollX);
    const bottom = Math.round(bcr.bottom + window.scrollY);
    const g = imgGeom.current;
    if (
      g.left !== left ||
      g.top !== top ||
      g.right !== right ||
      g.bottom !== bottom
    ) {
      g.left = left;
      g.top = top;
      g.right = right;
      g.bottom = bottom;
      if (stateRef.current.currentRegion) {
        showRegion(stateRef.current.currentRegion);
      }
    }
  }, [showRegion]);

  /**
   * Save the reference to given DOM element
   */
  const saveRef = useCallback(
    (type, element) => {
      if (element) {
        eltRefs.current[type] = element;
        if (type === 'img') {
          checkImgLocation();
        }
      }
    },
    [checkImgLocation]
  );

  const handleMouseDown = useCallback((e) => {
    const g = imgGeom.current;
    if (
      e.nativeEvent.pageX > g.left &&
      e.nativeEvent.pageY > g.top &&
      e.nativeEvent.pageX < g.right &&
      e.nativeEvent.pageY < g.bottom
    ) {
      setStartX(e.nativeEvent.pageX);
      setStartY(e.nativeEvent.pageY);
      setMinX(null);
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    const sx = stateRef.current.startX;
    const sy = stateRef.current.startY;
    if (typeof sx !== 'number') {
      return;
    }
    const g = imgGeom.current;
    const eventX = Math.min(Math.max(e.nativeEvent.pageX, g.left), g.right);
    const eventY = Math.min(Math.max(e.nativeEvent.pageY, g.top), g.bottom);
    const newMinX = Math.min(sx, eventX);
    const newMinY = Math.min(sy, eventY);
    setMinX(newMinX);
    setMinY(newMinY);
    setWidth(Math.max(Math.max(sx, eventX) - newMinX, 5));
    setHeight(Math.max(Math.max(sy, eventY) - newMinY, 5));
  }, []);

  const handleMouseUp = useCallback(() => {
    setStartX(null);
    const s = stateRef.current;
    const g = imgGeom.current;
    if (s.minX) {
      const imgWidth = g.right - g.left;
      const imgHeight = g.bottom - g.top;
      const region = {
        left: Math.round(((s.minX - g.left) / imgWidth) * g.naturalWidth),
        top: Math.round(((s.minY - g.top) / imgHeight) * g.naturalHeight),
      };
      region.right =
        region.left + Math.round((s.width / imgWidth) * g.naturalWidth);
      region.bottom =
        region.top + Math.round((s.height / imgHeight) * g.naturalHeight);
      console.log('box', region.left, region.top, region.right, region.bottom);
      setCurrentRegion(region);
    }
  }, []);

  const startY_ = startY; // suppress unused warning if any
  void startY_;

  const changeCameraID = useCallback((value) => {
    setCameraID(value);
  }, []);

  const changeDateTime = useCallback((value) => {
    setDateTimeVal(value);
  }, []);

  const changeNotes = useCallback((event) => {
    setNotes(event.target.value);
  }, []);

  /**
   * Fetch an image of currently selected camera and date/time after adding timeOffsetSec
   */
  const fetchImage = useCallback(async (timeOffsetSec = 0) => {
    const s = stateRef.current;
    if (!s.dateTimeVal || !s.cameraID || !s.cameraID.length) {
      return;
    }
    const camId = s.cameraID[0].value;
    const updatedTimeValue = s.dateTimeVal.valueOf() + timeOffsetSec * 1000;
    const dateISO = new Date(updatedTimeValue).toISOString();
    setImageMsg('Fetching image.  Should appear soon if found');
    console.log('Fetch', camId, dateISO);
    const direction =
      timeOffsetSec > 0 ? 'positive' : timeOffsetSec < 0 ? 'negative' : '';
    const urlComponents = [
      'cameraID=' + encodeURIComponent(camId),
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
        setImageUrl(serverResJson.imageUrl);
        setImageName(serverResJson.imageName);
        setDateTimeVal(new Date(serverResJson.imageTime));
        setImageMsg(null);
        setStartX(null);
        setMinX(null);
        setCurrentRegion(null);
      } else {
        setImageUrl(null);
        setImageMsg(
          'Image could not be found.  Select a different camera, date, or time.'
        );
      }
    } else {
      const serverResText = await serverRes.text();
      console.log('FetchImage response', serverRes.status, serverResText);
      setImageUrl(null);
      setImageMsg('Error: ' + serverRes.status + ': ' + serverResText);
    }
  }, []);

  /**
   * Save the currently selected bounding box and advance the image by 1 minute
   */
  const saveAndAdvance = useCallback(async () => {
    const s = stateRef.current;
    if (s.currentRegion && s.currentRegion.left != null) {
      const postParams = {
        fileName: s.imageName,
        minX: s.currentRegion.left,
        minY: s.currentRegion.top,
        maxX: s.currentRegion.right,
        maxY: s.currentRegion.bottom,
        notes: s.notes,
      };
      const serverUrl = getServerUrl('/api/setBbox');
      const serverRes = await serverPost(serverUrl, postParams);
      console.log('setBbox respose', serverRes);
      if (serverRes === 'success') {
        fetchImage(60);
      } else {
        setImageMsg(
          'Failed to save bounding box.  Please reload the page and retry. If the problem persists, notify administrator'
        );
      }
    }
  }, [fetchImage]);

  // Install keyboard shortcuts on mount; load camera list
  useEffect(() => {
    const keyDown = (e) => {
      // Skip arrow/'s' shortcuts when the user is typing inside an input,
      // textarea, or contenteditable element (covers the camera picker search
      // field, date-time picker inputs, and the notes input). Using closest()
      // handles nested focus inside custom components without needing wrapper
      // refs, and avoids suppressing shortcuts when non-text controls (e.g.
      // the "Fetch image" button) are focused via keyboard navigation.
      const ae = document.activeElement;
      if (ae && ae.closest('input, textarea, select, [contenteditable]')) {
        return;
      }
      const keyCodeToOffset = {
        38: 10,
        40: -10,
        37: -1,
        39: 1,
      };
      const timeOffsetMin = keyCodeToOffset[e.keyCode];
      const s = stateRef.current;
      if (timeOffsetMin && s.imageUrl && s.dateTimeVal) {
        fetchImage(timeOffsetMin * 60);
      } else if (e.keyCode === 83) {
        saveAndAdvance();
      }
    };
    document.addEventListener('keydown', keyDown);

    (async () => {
      const serverUrl = getServerUrl('/api/listCameras');
      const serverRes = await serverGet(serverUrl);
      if (serverRes.status === 200) {
        const serverResJson = await serverRes.json();
        console.log('List cameras', serverRes.status, serverResJson);
        if (serverResJson) {
          setCameraOptions(
            serverResJson.map((id) => ({ value: id, label: id }))
          );
        } else {
          setImageMsg('Failed to get cameras.  Try reloading.');
        }
      } else {
        const serverResText = await serverRes.text();
        console.log('ListCameras response', serverRes.status, serverResText);
        setImageMsg('Error: ' + serverRes.status + ': ' + serverResText);
      }
    })();

    return () => {
      document.removeEventListener('keydown', keyDown);
    };
  }, [fetchImage, saveAndAdvance]);

  return (
    <div>
      <h1>Label images</h1>
      {props.validCookie ? (
        <div>
          <div className="">
            <Select
              ref={(e) => saveRef('cameraPicker', e)}
              className="w3-col s4 w3-margin-left"
              value={cameraID}
              onChange={(v) => changeCameraID(v)}
              options={cameraOptions}
            />
            <DateTimePicker
              ref={(e) => saveRef('dateTimePicker', e)}
              className="w3-col s4 w3-margin-left"
              onChange={(v) => changeDateTime(v)}
              value={dateTimeVal}
            />
            <button
              className={
                'w3-button w3-border w3-round-large w3-black w3-margin-left' +
                (dateTimeVal && cameraID ? '' : ' w3-disabled')
              }
              onClick={() => fetchImage()}
            >
              Fetch image
            </button>
          </div>
          <div className="w3-bar w3-padding">
            {imageMsg ? imageMsg : <span>&nbsp;</span>}
          </div>
          {imageUrl && (
            <div className="w3-bar w3-padding">
              <p>
                Mark (click and drag) a rectangle on top of the image below to
                select the bounding box around the visible smoke in the image.
                You can restart anytime by marking a new rectangle. When
                satisfied, click the Save button below the image (or press 's'
                key). The arrow keys are keyboard shortcuts for moving image
                forward and backward in time. Left/Right arrow keys move time
                by 1 minute. Up/Down arrow keys move time by 10 minutes.
              </p>
              <div
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                <ResizeObserver onReflow={() => checkImgLocation()} />
                <img
                  src={imageUrl}
                  alt="Scene with possible smoke"
                  draggable={false}
                  width="100%;"
                  ref={(e) => saveRef('img', e)}
                />
                {minX && (
                  <div
                    style={{
                      zIndex: 10,
                      position: 'absolute',
                      left: minX + 'px',
                      top: minY + 'px',
                      width: width + 'px',
                      height: height + 'px',
                      backgroundColor: 'transparent',
                      border: '1px solid blue',
                    }}
                  ></div>
                )}
              </div>
              <div className="w3-padding">
                <label>
                  Notes (optional - please enter 'test' when testing):
                  <input
                    type="text"
                    ref={(e) => saveRef('notes', e)}
                    className="w3-margin-left"
                    value={notes}
                    onChange={(e) => changeNotes(e)}
                  />
                </label>
              </div>
              <div className="w3-padding">
                <button
                  className={
                    'w3-button w3-border w3-round-large w3-black' +
                    (minX ? '' : ' w3-disabled')
                  }
                  onClick={() => saveAndAdvance()}
                >
                  Save smoke bounding box and advance to next image (keyboard
                  shortcut 's')
                </button>
                <button
                  className="w3-button w3-border w3-round-large w3-black"
                  onClick={() => fetchImage(60)}
                >
                  Discard bounding box (if any) and advance to next image
                  (keyboard shortcut right arrow key)
                </button>
              </div>
              <div className="w3-padding"></div>
            </div>
          )}
        </div>
      ) : (
        <p>Sign in above to store your preferred area.</p>
      )}
    </div>
  );
}

export default LabelImage;
