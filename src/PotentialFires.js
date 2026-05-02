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

// Display live feed of recent potential fires

import React, { useEffect, useRef, useState, useCallback } from 'react';

function PotentialFires() {
  const eventsUrl =
    process.env.NODE_ENV === 'development'
      ? `http://localhost:${process.env.REACT_APP_BE_PORT}/fireEvents`
      : '/fireEvents';

  const [potentialFires, setPotentialFires] = useState([]);
  const sseVersionRef = useRef(null);
  const eventSourceRef = useRef(null);

  const stopUpdates = useCallback((e) => {
    console.log('stopUpdates', e);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  }, []);

  const newPotentialFire = useCallback((e) => {
    // console.log('newPotentialFire', e);
    const parsed = JSON.parse(e.data);
    // first check version number
    if (!sseVersionRef.current) {
      // record version number on first response
      sseVersionRef.current = parsed.version;
      console.log('Checkfire SSE version', sseVersionRef.current);
    }
    if (sseVersionRef.current !== parsed.version) {
      // reload page on version mismatch
      console.log(
        'Checkfire SSE mismatch',
        sseVersionRef.current,
        parsed.version
      );
      window.location.reload();
    }

    setPotentialFires((prevFires) => {
      // next check for duplicate
      const alreadyExists = prevFires.find(
        (i) =>
          i.timestamp === parsed.timestamp && i.cameraID === parsed.cameraID
      );
      if (alreadyExists) {
        return prevFires;
      }

      // now insert new fires at right timeslot
      return [parsed]
        .concat(prevFires)
        .sort((a, b) => b.timestamp - a.timestamp) // sort by timestamp descending
        .slice(0, 20); // limit to most recent 20
    });
  }, []);

  useEffect(() => {
    const es = new EventSource(eventsUrl);
    eventSourceRef.current = es;
    es.addEventListener('newPotentialFire', newPotentialFire);
    es.addEventListener('closedConnection', stopUpdates);
    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [eventsUrl, newPotentialFire, stopUpdates]);

  return (
    <div>
      <h1 className="w3-padding-32 w3-row-padding" id="projects">
        Potential fires (without votes)
      </h1>
      {potentialFires.map((potFire) => {
          return (
            <div key={potFire.annotatedUrl} data-testid="FireListElement">
              <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
                <h5>
                  {new Date(potFire.timestamp * 1000).toLocaleString('en-US')}
                  :&nbsp;
                  {potFire.camInfo.cameraName} camera
                  {potFire.camInfo.cameraDir
                    ? ' facing ' + potFire.camInfo.cameraDir
                    : ''}
                  &nbsp;with score {Number(potFire.adjScore).toFixed(2)}
                  &nbsp;(
                  <a
                    href={potFire.annotatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    full image
                  </a>
                  )
                </h5>
                <video
                  controls
                  autoPlay
                  muted
                  loop
                  width="898"
                  height="898"
                  poster={potFire.croppedUrl}
                >
                  <source src={potFire.croppedUrl} type="video/mp4" />
                  Your browser does not support the video tag
                </video>
              </div>
              &nbsp;
            </div>
          );
        })}
    </div>
  );
}

export default PotentialFires;
