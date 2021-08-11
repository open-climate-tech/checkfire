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

// Utility functions for react code

import React from "react";

/**
 * Return the full URL for UI backend for given route
 * @param {string} path 
 */
export function getServerUrl(path) {
  const serverPrefix = (process.env.NODE_ENV === 'development') ?
    `http://localhost:${process.env.REACT_APP_BE_PORT}` : '';
  return serverPrefix + path;
}

/**
 * Make a GET API call to the UI backend to given URL
 * @param {string} serverUrl 
 */
export async function serverGet(serverUrl) {
  const getParams = {};
  if (process.env.NODE_ENV === 'development') {
    getParams.credentials = 'include'; //send cookies to dev server on separate port
  }
  return await fetch(serverUrl, getParams);
}

/**
 * Make POST API call to the UI backend to given URL with given body data
 * @param {string} serverUrl 
 * @param {json} body 
 */
export async function serverPost(serverUrl, body) {
  const postParams = {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
  }
  if (process.env.NODE_ENV === 'development') {
    postParams.credentials = 'include'; //send cookies to dev server on separate port
  }
  const resp = await fetch(serverUrl, postParams);
  return await resp.text();
}

export async function getUserPreferences() {
  const serverUrl = getServerUrl('/api/getPreferences');
  const resp = await serverGet(serverUrl);
  return await resp.json();
}

/**
 * Show preview of the potential fire along with caller specified childComponent
 * @param {*} props
 */
export function FirePreview(props) {
  return (
    <div key={props.potFire.annotatedUrl} data-testid="FireListElement">
      <div className="w3-row-padding w3-padding-16 w3-container w3-light-grey">
        <h5>
          {new Date(props.potFire.timestamp * 1000).toLocaleString("en-US")}:&nbsp;
          {props.potFire.camInfo.cityName}
          &nbsp;(
            <a href={props.potFire.camInfo.networkUrl} target="_blank" rel="noopener noreferrer">{props.potFire.camInfo.network}</a>
            &nbsp;
            <a href={props.potFire.camInfo.camerakUrl} target="_blank" rel="noopener noreferrer">
              {props.potFire.camInfo.cameraName}
              {props.potFire.camInfo.cameraDir && ' facing ' + props.potFire.camInfo.cameraDir}
            </a>
          )
          {/* &nbsp;with score {Number(props.potFire.adjScore).toFixed(2)} */}
          :&nbsp;
          <a href={props.potFire.annotatedUrl} target="_blank" rel="noopener noreferrer">Full image</a>
          {props.showProto && props.potFire.weatherScore &&
            <div>
              Wscore: {props.potFire.weatherScore}
            </div>
          }
        </h5>
        <div className="w3-col m8">
          <video controls autoPlay muted loop width="800" height="600" poster={props.potFire.croppedUrl}>
            <source src={props.potFire.croppedUrl} type="video/mp4" />
            Your browser does not support the video tag
          </video>
        </div>
        <div className="w3-col m4">
          {props.childComponent}
          <div className="w3-padding-32">
            <p>View area</p>
            <img width="320" height="320" src={props.potFire.mapUrl} alt="Viewshed" />
          </div>
        </div>
      </div>
      &nbsp;
    </div>
  );
}
