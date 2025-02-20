// -----------------------------------------------------------------------------
// Copyright 2022 Open Climate Tech Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// -----------------------------------------------------------------------------

// TODO:
//   - Handle updates to existing fires.
//   - Handle fires aging out (on a timer?).
//   - Write user preferences.
//   - Implement camera ID pinning.
//   - Implement adaptive/mobile version.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Notification from 'react-web-notification';

import Duration from '../modules/Duration.mjs';

import getCameraKey from '../modules/getCameraKey.mjs';
import getEventSource from '../modules/getEventSource.mjs';
import getPreferences from '../modules/getPreferences.mjs';
import hasAngleOfFire from '../modules/hasAngleOfFire.mjs';
import isPolygonWithinRegion from '../modules/isPolygonWithinRegion.mjs';

import FireList from './FireList.jsx';

const ShouldNotify = {
  MIN_INTERVAL_SECONDS: 30,
  MAX_RECENT_NOTIFICATIONS: 2,
  MAX_RECENT_SECONDS: 5 * 60,
  // XXX: Used to instantiate empty Notification to track window activity.
  NO_NOTIFICATION: {},
};

const TIMESTAMP_LIMIT = 2 * Duration.HOUR;

const { error: report } = console;

/**
 * Responsible for querying the detected fire list, monitoring new fire events,
 * and transitioning between lists of new, extant, and old potential fires.
 *
 * @returns {React.Element}
 */
export default function PotentialFireList(props) {
  // Fires newer than `TIMESTAMP_LIMIT` (or all fires if `includesAllFires` is
  // `true`) displayed to the user for review.
  const [fires, setFires] = useState([]);
  const [includesAllFires, setIncludesAllFires] = useState(false);
  const [indexOfOldFires, setIndexOfOldFires] = useState(-1);
  const [region, setRegion] = useState(null);
  const [shouldNotify, setShouldNotify] = useState(false);
  const [notification, setNotification] = useState(
    ShouldNotify.NO_NOTIFICATION
  );

  const allFiresRef = useRef([]);
  const eventSourceRef = useRef();
  const firesByKeyRef = useRef({});
  const sseVersionRef = useRef();

  const updateFires = useCallback((shouldIncludeAllFires) => {
    const { current: allFires } = allFiresRef;
    const timestampLimit = Math.round((Date.now() - TIMESTAMP_LIMIT) / 1000);
    const index = allFires.findIndex((x) => x.timestamp < timestampLimit);
    const fires = shouldIncludeAllFires
      ? allFires.slice(0)
      : allFires.slice(0, index);

    setFires(fires);
    setIndexOfOldFires(index);
  }, []);

  const handleNotification = useCallback(() => {
    if (!shouldNotify) {
      return setNotification(ShouldNotify.NO_NOTIFICATION);
    }

    const { current: allFires } = allFiresRef;
    const fire = allFires[0];
    const {
      camInfo: { cameraName, cameraDir = 'UNKNOWN' },
      isRealTime,
      notified = false,
      timestamp,
    } = fire;

    if (notified || !isRealTime) {
      return report(
        'Failed precondition: `fire` should be real-time and shouldn’t be notified'
      );
    }

    // -------------------------------------------------------------------------
    // Prevent notifications from appearing too frequently.

    const notifiedFires = allFires.filter((x) => x.isRealTime && x.notified);
    const mru = notifiedFires.length > 0 ? notifiedFires[0].timestamp : 0;

    // At least MIN_INTERVAL_SECONDS between notifications.
    if (timestamp - mru <= ShouldNotify.MIN_INTERVAL_SECONDS) {
      return setNotification(ShouldNotify.NO_NOTIFICATION);
    }

    const timestampLimit = timestamp - ShouldNotify.MAX_RECENT_SECONDS;
    const recentlyNotifiedFires = notifiedFires.filter(
      (x) => x.timestamp > timestampLimit
    );

    // At most MAX_RECENT_NOTIFICATIONS every MAX_RECENT_SECONDS.
    if (recentlyNotifiedFires.length >= ShouldNotify.MAX_RECENT_NOTIFICATIONS) {
      return setNotification(ShouldNotify.NO_NOTIFICATION);
    }

    // -------------------------------------------------------------------------

    fire.notified = true;

    setNotification({
      title: 'Potential fire',
      options: {
        body: `Camera ${cameraName} facing ${cameraDir}`,
        icon: '/wildfirecheck/checkfire192.png',
        lang: 'en',
        tag: `${timestamp}`,
      },
    });
  }, [shouldNotify]);

  const handleToggleAllFires = useCallback(() => {
    const shouldIncludeAllFires = !includesAllFires;
    setIncludesAllFires(shouldIncludeAllFires);
    updateFires(shouldIncludeAllFires);
  }, [includesAllFires, updateFires]);

  const handlePotentialFire = useCallback(
    (event) => {
      const fire = JSON.parse(event.data);
      const { cameraID, croppedUrl, polygon, timestamp, version } = fire;

      if (region != null && !isPolygonWithinRegion(polygon, region)) {
        return false;
      }

      if (!croppedUrl || croppedUrl.startsWith('c:/')) {
        return;
      }

      if (sseVersionRef.current == null) {
        sseVersionRef.current = version;
      }

      if (version !== sseVersionRef.current) {
        return window.location.reload();
      }

      const { current: allFires } = allFiresRef;
      const { current: firesByKey } = firesByKeyRef;
      const key = getCameraKey(fire);

      if (firesByKey[key] != null) {
        if (firesByKey[key].croppedUrl !== croppedUrl) {
          // Fire is already indexed, but its video has been updated.
          firesByKey[key].croppedUrl = croppedUrl[
            // TODO: Update video source, reload video.
            'console'
          ].error('Not implemented: updateFires()');
        }
      } else {
        allFires.forEach((x) => hasAngleOfFire(x, fire));

        firesByKey[key] = fire;
        allFires.unshift(fire);
        allFires.sort((a, b) => b.sortId - a.sortId);

        const first = allFires[0];
        if (first != null) {
          if (
            first.isRealTime &&
            first.timestamp === timestamp &&
            first.cameraID === cameraID
          ) {
            handleNotification();
          }
        }

        updateFires(includesAllFires);
      }
    },
    [handleNotification, includesAllFires, region, updateFires]
  );

  useEffect(() => {
    getPreferences().then(({ region, shouldNotify }) => {
      setRegion(region);
      setShouldNotify(shouldNotify);
    });
  }, []);

  useEffect(() => {
    if (eventSourceRef.current == null) {
      eventSourceRef.current = getEventSource('/fireEvents');
    }

    const { current: eventSource } = eventSourceRef;

    function handleClosedConnection() {
      eventSourceRef.current = null;
      tidy();
    }

    function tidy() {
      eventSource.removeEventListener('newPotentialFire', handlePotentialFire);
      eventSource.removeEventListener(
        'closedConnection',
        handleClosedConnection
      );
    }

    eventSource.addEventListener('newPotentialFire', handlePotentialFire);
    eventSource.addEventListener('closedConnection', handleClosedConnection);

    return tidy;
  }, [handlePotentialFire]);

  return (
    0,
    (
      <>
        <Notification disableActiveWindow={true} title="" {...notification} />
        <FireList
          fires={fires}
          firesByKey={firesByKeyRef.current}
          indexOfOldFires={includesAllFires ? indexOfOldFires : -1}
          nOldFires={
            indexOfOldFires > -1
              ? allFiresRef.current.length - indexOfOldFires
              : 0
          }
          onToggleAllFires={handleToggleAllFires}
          region={region}
          updateFires={updateFires}
          {...props}
        />
      </>
    )
  );
}
