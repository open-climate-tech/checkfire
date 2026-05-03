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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Notification from 'react-web-notification';

import {
  getServerUrl,
  serverPost,
  getUserPreferences,
  FirePreview,
  VoteButtons,
} from './OctReactUtils';

const HOURS_LIMIT = 2;

function isHorizIntersection(commonLat, leftLong, rightLong, vertices) {
  if (Math.abs(vertices[1][0] - vertices[0][0]) < 0.01) {
    return false;
  }
  const t1 = (commonLat - vertices[0][0]) / (vertices[1][0] - vertices[0][0]);
  if (t1 >= 0 && t1 <= 1) {
    const intersectionLong =
      (vertices[1][1] - vertices[0][1]) * t1 + vertices[0][1];
    return intersectionLong >= leftLong && intersectionLong <= rightLong;
  }
  return false;
}

function isVertIntersection(commonLong, bottomLat, topLat, vertices) {
  if (Math.abs(vertices[1][1] - vertices[0][1]) < 0.01) {
    return false;
  }
  const t1 =
    (commonLong - vertices[0][1]) / (vertices[1][1] - vertices[0][1]);
  if (t1 >= 0 && t1 <= 1) {
    const intersectionLat =
      (vertices[1][0] - vertices[0][0]) * t1 + vertices[0][0];
    return intersectionLat >= bottomLat && intersectionLat <= topLat;
  }
  return false;
}

function isFireInRegion(potFire, userRegion, locationID) {
  if (locationID && !potFire.cameraID.startsWith(locationID + '-')) {
    return false;
  }

  if (!userRegion || !userRegion.topLat || !potFire.polygon) {
    return true;
  }
  let minLat = 90;
  let maxLat = 0;
  let minLong = 0;
  let maxLong = -180;
  let vertexInRegion = false;
  potFire.polygon.forEach((vertex) => {
    minLat = Math.min(minLat, vertex[0]);
    maxLat = Math.max(maxLat, vertex[0]);
    minLong = Math.min(minLong, vertex[1]);
    maxLong = Math.max(maxLong, vertex[1]);
    if (!vertexInRegion) {
      vertexInRegion =
        vertex[0] >= userRegion.bottomLat &&
        vertex[0] <= userRegion.topLat &&
        vertex[1] >= userRegion.leftLong &&
        vertex[1] <= userRegion.rightLong;
    }
  });
  if (vertexInRegion) {
    return true;
  }
  if (
    minLat > userRegion.topLat ||
    maxLat < userRegion.bottomLat ||
    minLong > userRegion.rightLong ||
    maxLong < userRegion.leftLong
  ) {
    return false;
  }
  const intersect = potFire.polygon.find((vertex, i) => {
    const nextVertex = potFire.polygon[(i + 1) % potFire.polygon.length];
    return (
      isHorizIntersection(
        userRegion.topLat,
        userRegion.leftLong,
        userRegion.rightLong,
        [vertex, nextVertex]
      ) ||
      isHorizIntersection(
        userRegion.bottomLat,
        userRegion.leftLong,
        userRegion.rightLong,
        [vertex, nextVertex]
      ) ||
      isVertIntersection(
        userRegion.leftLong,
        userRegion.bottomLat,
        userRegion.topLat,
        [vertex, nextVertex]
      ) ||
      isVertIntersection(
        userRegion.rightLong,
        userRegion.bottomLat,
        userRegion.topLat,
        [vertex, nextVertex]
      )
    );
  });
  return intersect;
}

function calculateRecentCounts(potentialFires, hoursLimit) {
  const nowSeconds = Math.round(new Date().valueOf() / 1000);
  const earliestTimestamp = nowSeconds - 3600 * hoursLimit;
  return {
    numRecentFires: potentialFires.filter(
      (f) => f.timestamp >= earliestTimestamp
    ).length,
    numOldFires: potentialFires.filter((f) => f.timestamp < earliestTimestamp)
      .length,
  };
}

function VoteFires(props) {
  const [potentialFires, setPotentialFires] = useState([]);
  const [numRecentFires, setNumRecentFires] = useState(0);
  const [numOldFires, setNumOldFires] = useState(0);
  const [showOldFires, setShowOldFires] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // URL param state is initialized to defaults so the server and client render
  // the same HTML on first pass (avoiding hydration mismatches). The mount
  // useEffect below reads window.location.search and applies real values.
  const [webNotify, setWebNotify] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyOptions, setNotifyOptions] = useState('');
  const [locationID, setLocationID] = useState(null);
  const [userRegion, setUserRegion] = useState(null);
  const [showProto, setShowProto] = useState(false);

  // Refs for values consumed inside SSE handlers (to avoid stale closures
  // and unnecessary handler reattachment).
  const sseVersionRef = useRef(null);
  const eventSourceRef = useRef(null);
  const userRegionRef = useRef(null);
  const locationIDRef = useRef(null);
  const webNotifyRef = useRef(false);
  const potentialFiresRef = useRef([]);

  useEffect(() => {
    userRegionRef.current = userRegion;
  }, [userRegion]);
  useEffect(() => {
    locationIDRef.current = locationID;
  }, [locationID]);
  useEffect(() => {
    webNotifyRef.current = webNotify;
  }, [webNotify]);
  useEffect(() => {
    potentialFiresRef.current = potentialFires;
  }, [potentialFires]);

  const clearNotification = useCallback(() => {
    setNotifyTitle('');
  }, []);

  const notify = useCallback((updatedFires) => {
    const newFire = updatedFires[0];
    if (newFire.notified || !newFire.isRealTime) {
      console.log(
        'Assumption violation: first fire should be realtime and not notified'
      );
      return;
    }
    const NOTIFY_GAP_MIN_SECONDS = 30;
    const NOTIFY_MAX_RECENT_NOTIFICAIONS = 2;
    const NOTIFY_MAX_RECENT_MINUTES = 5;
    const notifiedFires = updatedFires.filter(
      (x) => x.isRealTime && x.notified
    );
    const mostRecentNotification = notifiedFires[0]
      ? notifiedFires[0].timestamp
      : 0;
    if (newFire.timestamp - mostRecentNotification < NOTIFY_GAP_MIN_SECONDS) {
      return;
    }
    const timeThreshold = newFire.timestamp - NOTIFY_MAX_RECENT_MINUTES * 60;
    const recentNotifiedFires = notifiedFires.filter(
      (x) => x.timestamp > timeThreshold
    );
    if (recentNotifiedFires.length > NOTIFY_MAX_RECENT_NOTIFICAIONS) {
      return;
    }
    newFire.notified = true;
    setNotifyTitle('Potential fire');
    setNotifyOptions({
      tag: newFire.timestamp.toString(),
      body: `Camera ${newFire.camInfo.cameraName} facing ${newFire.camInfo.cameraDir}`,
      icon: '/wildfirecheck/checkfire192.png',
      lang: 'en',
    });
  }, []);

  const newPotentialFire = useCallback(
    (e) => {
      clearNotification();
      const parsed = JSON.parse(e.data);
      if (!sseVersionRef.current) {
        sseVersionRef.current = parsed.version;
        console.log('Checkfire SSE version', sseVersionRef.current);
      }
      if (sseVersionRef.current !== parsed.version) {
        console.log(
          'Checkfire SSE mismatch',
          sseVersionRef.current,
          parsed.version
        );
        window.location.reload();
      }

      if (
        !isFireInRegion(parsed, userRegionRef.current, locationIDRef.current)
      ) {
        return;
      }

      setPotentialFires((prevFires) => {
        const alreadyExists = prevFires.find(
          (i) =>
            i.timestamp === parsed.timestamp && i.cameraID === parsed.cameraID
        );

        let updatedFires;
        if (alreadyExists) {
          if (alreadyExists.croppedUrl === parsed.croppedUrl) {
            return prevFires;
          }
          updatedFires = prevFires.map((f) =>
            f.timestamp === parsed.timestamp && f.cameraID === parsed.cameraID
              ? Object.assign({}, f, { croppedUrl: parsed.croppedUrl })
              : f
          );
          console.log('newPotentialFire: diff cropped', parsed.croppedUrl);
        } else {
          updatedFires = [parsed]
            .concat(prevFires)
            .sort((a, b) => b.sortId - a.sortId)
            .slice(0, 20);

          const newTop = updatedFires[0];
          if (
            newTop &&
            newTop.isRealTime &&
            webNotifyRef.current &&
            newTop.timestamp === parsed.timestamp &&
            newTop.cameraID === parsed.cameraID
          ) {
            setTimeout(() => notify(updatedFires), 0);
          }
        }

        const counts = calculateRecentCounts(updatedFires, HOURS_LIMIT);
        setNumRecentFires(counts.numRecentFires);
        setNumOldFires(counts.numOldFires);
        return updatedFires;
      });
    },
    [clearNotification, notify]
  );

  const stopUpdates = useCallback((e) => {
    console.log('stopUpdates', e);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  }, []);

  // Mount-time setup: parse query string, open SSE, fetch preferences,
  // and start periodic recent-count refresh.
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const initialLocationID = queryParams.get('locID');
    const latLongStr = queryParams.get('latLong');
    const notifyStr = queryParams.get('notify');
    const twoPointOne = '([0-9]{2}(?:\\.[0-9])?)';
    const negThreePointOne = '(-[0-9]{3}(?:\\.[0-9])?)';
    const regexLatLong = RegExp(
      '^' +
        twoPointOne +
        ',' +
        twoPointOne +
        ',' +
        negThreePointOne +
        ',' +
        negThreePointOne +
        '$'
    );
    const latLongParsed = regexLatLong.exec(latLongStr);
    let parsedRegion = null;
    if (latLongParsed) {
      parsedRegion = {
        bottomLat: parseFloat(latLongParsed[1]),
        topLat: parseFloat(latLongParsed[2]),
        leftLong: parseFloat(latLongParsed[3]),
        rightLong: parseFloat(latLongParsed[4]),
      };
      if (
        parsedRegion.topLat > 90 ||
        parsedRegion.bottomLat > 90 ||
        parsedRegion.topLat < parsedRegion.bottomLat + 0.3 ||
        parsedRegion.leftLong < -180 ||
        parsedRegion.rightLong < -180 ||
        parsedRegion.rightLong < parsedRegion.leftLong + 0.3
      ) {
        parsedRegion = null;
      }
    }
    let webNotifyQP = false;
    if (notifyStr && (notifyStr === 'true' || notifyStr === 'false')) {
      webNotifyQP = notifyStr === 'true';
    }
    // Setup SSE connection
    const sseConfig = {};
    if (process.env.NODE_ENV === 'development') {
      sseConfig.withCredentials = true;
    }
    const eventsUrl = getServerUrl('/fireEvents');
    const es = new EventSource(eventsUrl, sseConfig);
    eventSourceRef.current = es;
    es.addEventListener('newPotentialFire', newPotentialFire);
    es.addEventListener('closedConnection', stopUpdates);

    // Update ref immediately so SSE handlers see the correct locationID
    // before the async getUserPreferences() resolves.
    locationIDRef.current = initialLocationID;

    // Apply user preferences (may override URL params)
    getUserPreferences().then((preferences) => {
      // Sync state inside async callback to avoid synchronous setState-in-effect
      setLocationID(initialLocationID);
      let regionToUse = parsedRegion;
      if (!parsedRegion || !latLongStr) {
        regionToUse = preferences.region;
      }
      setUserRegion(regionToUse);
      setWebNotify(
        notifyStr
          ? webNotifyQP
          : preferences.webNotify || Boolean(initialLocationID)
      );
      setShowProto(preferences.showProto);
      // re-filter existing fires based on new region. Use a functional
      // setState updater to read the latest fires committed so far,
      // avoiding races with SSE events that may have arrived before
      // getUserPreferences() resolved (potentialFiresRef may not yet
      // reflect those state updates).
      if (regionToUse && regionToUse.topLat) {
        setPotentialFires((prevFires) => {
          if (!prevFires || !prevFires.length) {
            return prevFires;
          }
          const selectedFires = prevFires.filter((potFire) =>
            isFireInRegion(potFire, regionToUse, initialLocationID)
          );
          if (selectedFires.length === prevFires.length) {
            return prevFires;
          }
          const counts = calculateRecentCounts(selectedFires, HOURS_LIMIT);
          setNumRecentFires(counts.numRecentFires);
          setNumOldFires(counts.numOldFires);
          return selectedFires;
        });
      }
    });

    // Periodic recent-vs-old refresh
    const intervalId = setInterval(() => {
      const counts = calculateRecentCounts(
        potentialFiresRef.current,
        HOURS_LIMIT
      );
      setNumRecentFires(counts.numRecentFires);
      setNumOldFires(counts.numOldFires);
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [newPotentialFire, stopUpdates]);

  const toggleOldFires = useCallback(() => {
    setShowOldFires((v) => !v);
  }, []);

  const toggleDetails = useCallback(() => {
    setShowDetails((v) => !v);
  }, []);

  const vote = useCallback(async (potFire, voteType) => {
    const serverUrl = getServerUrl(
      voteType === 'undo' ? '/api/undoVoteFire' : '/api/voteFire'
    );
    const serverRes = await serverPost(serverUrl, {
      cameraID: potFire.cameraID,
      timestamp: potFire.timestamp,
      isRealFire: voteType === 'yes',
    });
    console.log('post res', serverRes);
    if (serverRes === 'success') {
      setPotentialFires((prev) =>
        prev.map((pFire) => {
          if (
            pFire.cameraID !== potFire.cameraID ||
            pFire.timestamp !== potFire.timestamp
          ) {
            return pFire;
          }
          const updatedFire = Object.assign({}, pFire);
          if (voteType === 'undo') {
            delete updatedFire.voted;
          } else {
            updatedFire.voted = voteType === 'yes';
          }
          return updatedFire;
        })
      );
    } else {
      window.location.reload();
    }
  }, []);

  return (
    <div>
      <span>
        <h1>WildfireCheck: Potential fires</h1>
        <p>
          Please note that this site does not alert the fire authorities
          directly. If you discover a real fire that recently ignited,
          consider informing the fire department to take appropriate action.
        </p>
        <button
          className="w3-button w3-border w3-round-large w3-black"
          onClick={toggleDetails}
        >
          {showDetails ? 'Hide description' : 'Show description'}
        </button>
      </span>
      {showDetails && (
        <div>
          <p>
            There is no need to refresh this page to see new fires because it
            automatically updates to display new detections. Note that the
            real-time detection is only active during daylight hours in
            California.
          </p>
          <p>
            This page shows recent potential fires as detected by the
            automated system. Each event displays a time-lapse video starting
            a few minutes prior to the detection. The video updates
            automatically for a few minutes after. The video shows a portion
            of the images near the suspected location of fire smoke
            (highlighted by a rectangle). The rectangle is colored yellow on
            images prior to the detection and colored red afterwards. To see a
            broader view for more context, click on the `&quot;`Full
            image`&quot;` link above the video.
          </p>
          <p>
            Each potential fire event display also includes a map showing the
            view area visible from the time-lapse video highlighted by a red
            triangle. When multiple cameras detect the same event, the
            intersection of all the triangles is highlighted in purple. The
            map also depicts any known prescribed burns using an icon with
            flames and a red cross.
          </p>
          <p>
            The system does generate false notifications, and signed-in users
            can vote whether system was correct or not. These votes help
            improve the system over time, so please consider voting.
          </p>
        </div>
      )}
      {locationID ? (
        <h5>
          Only potential fires from camera location{' '}
          <strong>{locationID}</strong> are being shown.
        </h5>
      ) : userRegion && userRegion.topLat ? (
        <h5>
          Only potential fires in selected region are being shown. To see
          potential fires across all cameras, remove the selection in the{' '}
          <Link href="/preferences">Preferences</Link> page.
        </h5>
      ) : (
        <p>
          Potential fires across all areas are being shown. Users can restrict
          potential fires to their specified region of interest on the{' '}
          <Link href="/preferences">Preferences</Link> page
        </p>
      )}
      {!webNotify && (
        <p>
          Users can choose to get notifications in real-time as new potential
          fire events are detected by selecting the option in the{' '}
          <Link href="/preferences">Preferences</Link> page.
        </p>
      )}
      {webNotify && (
        <Notification
          ignore={notifyTitle === ''}
          disableActiveWindow={true}
          title={notifyTitle}
          options={notifyOptions}
        />
      )}
      {numRecentFires > 0 ? (
        potentialFires.slice(0, numRecentFires).map((potFire) => (
          <FirePreview
            key={potFire.annotatedUrl}
            potFire={potFire}
            showProto={showProto}
            childComponent={
              <VoteButtons
                validCookie={props.validCookie}
                potFire={potFire}
                onVote={(f, v) => vote(f, v)}
              />
            }
          />
        ))
      ) : (
        <p>No fire starts detected in last {HOURS_LIMIT} hours.</p>
      )}
      {numOldFires > 0 && (
        <div>
          <button
            className="w3-button w3-border w3-round-large w3-black"
            data-cy="toggleOldFires"
            onClick={toggleOldFires}
          >
            {showOldFires ? 'Hide old fires' : 'Show old fires'}
          </button>
          <div className="w3-padding"></div>
          {showOldFires && (
            <div>
              <p>Potential fires older than {HOURS_LIMIT} hours</p>
              {potentialFires.slice(numRecentFires).map((potFire) => (
                <FirePreview
                  key={potFire.annotatedUrl}
                  potFire={potFire}
                  showProto={showProto}
                  childComponent={
                    <VoteButtons
                      validCookie={props.validCookie}
                      potFire={potFire}
                      onVote={(f, v) => vote(f, v)}
                    />
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VoteFires;
