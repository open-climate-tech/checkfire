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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ResizeObserver from 'react-resize-observer';
import Notification from 'react-web-notification';

import { getServerUrl, serverPost, getUserPreferences } from './OctReactUtils';
import cams1320Img from './midsocalCams-1320x1150.jpg';
const cams1320 = typeof cams1320Img === 'string' ? cams1320Img : cams1320Img.src;
import cams1110Img from './midsocalCams-1110x960.jpg';
const cams1110 = typeof cams1110Img === 'string' ? cams1110Img : cams1110Img.src;
import cams930Img from './midsocalCams-930x810.jpg';
const cams930 = typeof cams930Img === 'string' ? cams930Img : cams930Img.src;
import cams780Img from './midsocalCams-780x680.jpg';
const cams780 = typeof cams780Img === 'string' ? cams780Img : cams780Img.src;

const maps = [
  {
    name: cams1320,
    topLat: 36.85,
    leftLong: -122.08,
    bottomLat: 32.39,
    rightLong: -115.83,
    pixelWidth: 1320,
    pixelHeight: 1150,
  },
  {
    name: cams1110,
    topLat: 36.86,
    leftLong: -122.11,
    bottomLat: 32.38,
    rightLong: -115.8,
    pixelWidth: 1110,
    pixelHeight: 960,
  },
  {
    name: cams930,
    topLat: 36.88,
    leftLong: -122.15,
    bottomLat: 32.35,
    rightLong: -115.8,
    pixelWidth: 930,
    pixelHeight: 810,
  },
  {
    name: cams780,
    topLat: 36.9,
    leftLong: -122.18,
    bottomLat: 32.33,
    rightLong: -115.8,
    pixelWidth: 780,
    pixelHeight: 680,
  },
];
maps.forEach((mapInfo) => {
  mapInfo.longWidth = mapInfo.rightLong - mapInfo.leftLong;
  mapInfo.latHeight = mapInfo.topLat - mapInfo.bottomLat;
});

function generateStatelessUrl(region, webNotify) {
  let latLongStr = '';
  if (region && region.topLat) {
    const latLongArr = [
      region.bottomLat.toFixed(1),
      region.topLat.toFixed(1),
      region.leftLong.toFixed(1),
      region.rightLong.toFixed(1),
    ];
    latLongStr = 'latLong=' + latLongArr.join(',');
  }
  const notifyStr = 'notify=' + webNotify.toString();
  const paramStr = [latLongStr, notifyStr].join('&');
  const pathStr = '/wildfirecheck/?' + paramStr;
  const url = window.location.origin + pathStr;
  return url;
}

function Preferences(props) {
  const [mapIndex, setMapIndex] = useState(1);
  const [webNotify, setWebNotify] = useState(false);
  const [notifBlocked, setNotifBlocked] = useState(false);
  const [statelessUrl, setStatelessUrl] = useState(
    generateStatelessUrl(null, false)
  );
  const [savedRegion, setSavedRegion] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [startX, setStartX] = useState(null);
  const [startY, setStartY] = useState(null);
  const [minX, setMinX] = useState(null);
  const [minY, setMinY] = useState(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const imgEltRef = useRef(null);
  const imgGeom = useRef({ left: null, top: null, right: null, bottom: null });

  // Snapshot of state for use inside callbacks/effects to avoid stale closures
  const stateRef = useRef({});
  stateRef.current = {
    mapIndex,
    webNotify,
    startX,
    startY,
    minX,
    minY,
    width,
    height,
    currentRegion,
    savedRegion,
  };

  /**
   * Display the given geographical region on the map
   */
  const showRegion = useCallback((region) => {
    const s = stateRef.current;
    const mapInfo = maps[s.mapIndex];
    const g = imgGeom.current;
    if (
      region &&
      region.topLat &&
      imgEltRef.current &&
      typeof g.left === 'number'
    ) {
      const topLat = Math.min(
        Math.max(region.topLat, mapInfo.bottomLat),
        mapInfo.topLat
      );
      const bottomLat = Math.min(
        Math.max(region.bottomLat, mapInfo.bottomLat),
        mapInfo.topLat
      );
      const leftLong = Math.min(
        Math.max(region.leftLong, mapInfo.leftLong),
        mapInfo.rightLong
      );
      const rightLong = Math.min(
        Math.max(region.rightLong, mapInfo.leftLong),
        mapInfo.rightLong
      );
      setMinX(
        ((leftLong - mapInfo.leftLong) / mapInfo.longWidth) *
          mapInfo.pixelWidth +
          g.left
      );
      setMinY(
        ((mapInfo.topLat - topLat) / mapInfo.latHeight) * mapInfo.pixelHeight +
          g.top
      );
      setWidth(
        ((rightLong - leftLong) / mapInfo.longWidth) * mapInfo.pixelWidth
      );
      setHeight(
        ((topLat - bottomLat) / mapInfo.latHeight) * mapInfo.pixelHeight
      );
      setStartX(null);
      setCurrentRegion(region);
      setStatelessUrl(generateStatelessUrl(region, s.webNotify));
    }
  }, []);

  const checkImgLocation = useCallback(() => {
    if (!imgEltRef.current) {
      return;
    }
    const bcr = imgEltRef.current.getBoundingClientRect();
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

  const saveImgRef = useCallback(
    (e) => {
      if (e) {
        imgEltRef.current = e;
        checkImgLocation();
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
    const s = stateRef.current;
    if (typeof s.startX !== 'number') {
      return;
    }
    const g = imgGeom.current;
    const eventX = Math.min(Math.max(e.nativeEvent.pageX, g.left), g.right);
    const eventY = Math.min(Math.max(e.nativeEvent.pageY, g.top), g.bottom);
    const newMinX = Math.min(s.startX, eventX);
    const newMinY = Math.min(s.startY, eventY);
    setMinX(newMinX);
    setMinY(newMinY);
    setWidth(Math.max(Math.max(s.startX, eventX) - newMinX, 20));
    setHeight(Math.max(Math.max(s.startY, eventY) - newMinY, 20));
  }, []);

  const handleMouseUp = useCallback(() => {
    const s = stateRef.current;
    const mapInfo = maps[s.mapIndex];
    const region = {};
    region.topLat =
      mapInfo.topLat -
      ((s.minY - imgGeom.current.top) / mapInfo.pixelHeight) *
        mapInfo.latHeight;
    region.bottomLat =
      region.topLat - (s.height / mapInfo.pixelHeight) * mapInfo.latHeight;
    region.leftLong =
      mapInfo.leftLong +
      ((s.minX - imgGeom.current.left) / mapInfo.pixelWidth) *
        mapInfo.longWidth;
    region.rightLong =
      region.leftLong + (s.width / mapInfo.pixelWidth) * mapInfo.longWidth;
    console.log(
      'box',
      region.topLat,
      region.leftLong,
      region.bottomLat,
      region.rightLong
    );
    setStartX(null);
    setCurrentRegion(region);
    setStatelessUrl(generateStatelessUrl(region, s.webNotify));
  }, []);

  /**
   * Save preferences to backend
   */
  const savePreferences = useCallback(async () => {
    const s = stateRef.current;
    if (props.validCookie) {
      if (s.currentRegion && s.currentRegion.topLat) {
        const serverUrl = getServerUrl('/api/setRegion');
        const serverRes = await serverPost(serverUrl, s.currentRegion);
        console.log('post region res', serverRes);
        setSavedRegion(s.currentRegion);
      }
      const serverUrl = getServerUrl('/api/setWebNotify');
      const serverRes = await serverPost(serverUrl, {
        webNotify: s.webNotify,
      });
      console.log('post notify res', serverRes);
    }
  }, [props.validCookie]);

  const removeSelection = useCallback(async () => {
    const serverUrl = getServerUrl('/api/setRegion');
    const serverRes = await serverPost(serverUrl, {
      topLat: 0,
      leftLong: 0,
      bottomLat: 0,
      rightLong: 0,
    });
    console.log('post res', serverRes);
    setStartX(null);
    setMinX(null);
    setCurrentRegion(null);
    setSavedRegion(null);
    setStatelessUrl(generateStatelessUrl(null, stateRef.current.webNotify));
  }, []);

  const zoomIn = useCallback(() => {
    setMapIndex((m) => (m > 0 ? m - 1 : m));
  }, []);
  const zoomOut = useCallback(() => {
    setMapIndex((m) => (m < maps.length - 1 ? m + 1 : m));
  }, []);

  const handleNotifyChange = useCallback(
    async (event) => {
      const checked = event.target.checked;
      setWebNotify(checked);
      setStatelessUrl(
        generateStatelessUrl(stateRef.current.currentRegion, checked)
      );
      if (props.validCookie) {
        const serverUrl = getServerUrl('/api/setWebNotify');
        const serverRes = await serverPost(serverUrl, { webNotify: checked });
        console.log('post notify res', serverRes);
      }
    },
    [props.validCookie]
  );

  const notifGranted = useCallback(() => setNotifBlocked(false), []);
  const notifDenied = useCallback(() => setNotifBlocked(true), []);

  // Load saved preferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const preferences = await getUserPreferences();
      if (cancelled) return;
      setSavedRegion(preferences.region);
      setWebNotify(preferences.webNotify);
      setStatelessUrl(
        generateStatelessUrl(preferences.region, preferences.webNotify)
      );
      const s = stateRef.current;
      if (!s.startX && !s.minX) {
        showRegion(preferences.region);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showRegion]);

  return (
    <div>
      <h1>Preferences</h1>
      <div>
        <h5>
          This page allows you to enable or disable notification and specify
          region of interest.
        </h5>
        {props.validCookie ? (
          <span></span>
        ) : (
          <div>
            There are two ways to remember these preferences.
            <ol className="w3-left-align">
              <li>
                Sign-in, save your preferences on the server, and stay
                signed-in when checking potential fires.
                {props.validCookie
                  ? ' You are currently signed in.'
                  : ' You are currently not signed in, but you can sign in using the button above.'}
              </li>
              <li>
                Use a special URL (generated by this page) that encodes the
                preferences. Note that the special URL must be used whenever
                you are checking potential fires.
              </li>
            </ol>
          </div>
        )}
      </div>
      <div>
        <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
          <h3>Notifications</h3>
          <div>
            <p>
              Check the below if you want to see notifications on your device
              whenever new potential fire events are discovered. Note the
              browser may ask you to allow showing notifications. Also note
              that the notifications are only shown when this site is not
              running in the foreground.
            </p>
            Notifications{' '}
            <input
              type="checkbox"
              id="webNotify"
              name="webNotify"
              checked={webNotify}
              onChange={(e) => handleNotifyChange(e)}
            ></input>
            {webNotify && (
              <Notification
                onPermissionGranted={notifGranted}
                onPermissionDenied={notifDenied}
                title=""
              />
            )}
            {webNotify && notifBlocked && (
              <p>
                Notifications are blocked by your browser. Please change
                settings if you want notifications.
              </p>
            )}
          </div>
        </div>
        <div className="w3-padding"></div>
        <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
          <h3>Choose region of interest</h3>
          <p>
            Mark (click and drag) a rectangle on top of the map below to
            select the geographical region where you are interested in
            monitoring potential fires. You can restart anytime by marking a
            new rectangle. When satisfied, click the Save button below the
            map.
          </p>
          <p>
            The red dots show the location of the cameras, and partially
            shaded red circles around each dot represent a 20 mile radius
            circular region that should be visible from each camera location.
            Actual visible area depends on terrain occlusions and atmospheric
            visibility conditions.
          </p>
          <div
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            <ResizeObserver onReflow={() => checkImgLocation()} />
            <img
              src={maps[mapIndex].name}
              alt="Map"
              draggable={false}
              ref={(e) => saveImgRef(e)}
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
            <button
              className={
                'w3-button w3-border w3-round-large w3-black' +
                (mapIndex === 0 ? ' w3-disabled' : '')
              }
              onClick={zoomIn}
            >
              Zoom in
            </button>
            <button
              className={
                'w3-button w3-border w3-round-large w3-black' +
                (mapIndex === maps.length - 1 ? ' w3-disabled' : '')
              }
              onClick={zoomOut}
            >
              Zoom out
            </button>
          </div>
          <div className="w3-padding">
            <button
              className={
                'w3-button w3-border w3-round-large w3-black' +
                (props.validCookie && savedRegion && savedRegion.topLat
                  ? ''
                  : ' w3-disabled')
              }
              onClick={() => showRegion(savedRegion)}
            >
              Restore saved region
            </button>
            <button
              className="w3-button w3-border w3-round-large w3-black"
              onClick={() => removeSelection()}
            >
              Remove selection
            </button>
          </div>
        </div>
        <div className="w3-padding"></div>
        <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
          {props.validCookie ? (
            <button
              className="w3-button w3-border w3-round-large w3-black"
              onClick={() => savePreferences()}
            >
              Save preferences
            </button>
          ) : (
            <div>
              <p>
                You are currently not signed in. To save your preferences on
                the server, you must sign in using the button at the top of
                the page.
              </p>
              <p>
                If you prefer to not sign-in, you can still encode your
                preferences in a special URL using the `&quot;`Open new tab
                with encoded URL`&quot;` button below. You may want to
                bookmark the new tab for the future.
              </p>
              <button
                className={
                  'w3-button w3-border w3-round-large w3-black' +
                  (props.validCookie ? '' : ' w3-disabled')
                }
                onClick={() => savePreferences()}
              >
                Save preferences
              </button>
              <a
                className="w3-button w3-border w3-round-large w3-black"
                target="_blank"
                rel="noopener noreferrer"
                href={statelessUrl}
              >
                Open new tab with encoded URL
              </a>
            </div>
          )}
        </div>
        <div className="w3-padding"></div>
      </div>
    </div>
  );
}

export default Preferences;
