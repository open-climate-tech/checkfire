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
import {Link, useLocation} from "react-router-dom";
import { useMediaQuery } from 'react-responsive'

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
  try {
    const serverUrl = getServerUrl('/api/getPreferences');
    const resp = await serverGet(serverUrl);
    return await resp.json();
  } catch (err) {
    console.log('getUserPreferences err', err);
    return {
      region: {},
      webNotify: false,
    };
  }
}

export function Legalese(props) {
  return (
    <div className="Disclaimer">
      <p>
        <a href="/terms.html">Terms and Conditions</a>
        &nbsp;|&nbsp;
        <a href="/privacy.html">Privacy Policy</a>
      </p>
    </div>
  )
}

/**
 * Show a list of maps with different zoom levels
 * @param {*} props
 */
export function ZoomableMaps(props) {
  const mapsList = props.mapUrls.split(',');
  const initialIndex = (mapsList.length > 1) ? (mapsList.length - 2) : 0;
  const [index, setIndex] = React.useState(initialIndex);
  return (
    <div>
      {/* <div className="w3-tooltip">
        <p className="tooltip-text" style={{width: '280px', left: '25%'}}>
          The map shows the view area visible from the time-lapse video highlighted by a red triangle.
          When multiple cameras detect the same event, the intersection of all the triangles is highlighted in purple.
          The map also depicts any known prescribed burns using an icon with flames and a red cross.
        </p>
        <p>View area</p>
      </div> */}
      <p style={{marginBottom:0}}>View area</p>
      <div className="w3-display-container" style={{height: "280px"}}>
        <div className="w3-display-topmiddle" style={{width: "280px"}}>
          {(mapsList.length > 1) &&
            <div className="w3-display-topleft">
              <button className={"w3-button w3-border w3-round-large w3-black w3-padding-small" + ((index === mapsList.length - 1) ? " w3-disabled" : "")}
                onClick={() => setIndex(index < mapsList.length - 1 ? index + 1 : index)}>+</button>
              <button className={"w3-button w3-border w3-round-large w3-black w3-padding-small" + ((index === 0) ? " w3-disabled" : "")}
                onClick={() => setIndex(index > 0 ? index - 1 : index)}>-</button>
            </div>
          }
          <img width="280" height="280" src={mapsList[index]} alt="Viewshed" />
        </div>
      </div>
    </div>
  );
}

function TimeLapseVideo(props) {
  return (
    <div className="w3-tooltip">
      <p className="tooltip-text" style={{width: '640px'}}>
        Time-lapse video starting a few minutes prior to the automatically detected potential wildfire.
        The video shows a portion of the images near the suspected location of fire smoke (highlighted by a rectangle).
        The rectangle is colored yellow on images prior to the detection and colored red afterwards.
        To see a broader view for more context, click on the "full image" link above the video.
      </p>
      <video controls autoPlay muted loop playsInline width="640" height="412" poster={props.videoUrl}>
        <source src={props.videoUrl} type="video/mp4" />
        Your browser does not support the video tag
      </video>
    </div>
  );
}

/**
 * Show preview of the potential fire along with caller specified childComponent
 * @param {*} props
 */
export function FirePreview(props) {
  // wide enough to show video and map side by side
  const sideBySide = useMediaQuery({ query: '(min-width: 1000px)' });
  return (
    <div key={props.potFire.croppedUrl} data-testid="FireListElement">
      <div className="w3-row-padding w3-padding-small w3-container w3-light-grey">
        <h5 style={{marginTop:0}}>
          {new Date(props.potFire.timestamp * 1000).toLocaleString("en-US")}:&nbsp;
          {props.potFire.camInfo.cityName}
          &nbsp;(
            <a href={props.potFire.camInfo.networkUrl} target="_blank" rel="noopener noreferrer">{props.potFire.camInfo.network}</a>
            &nbsp;
            <a href={props.potFire.camInfo.camerakUrl} target="_blank" rel="noopener noreferrer">
              {props.potFire.camInfo.cameraName}
            </a>
            {props.potFire.camInfo.cameraDir && ' facing ' + props.potFire.camInfo.cameraDir}
          )
          {/* &nbsp;with score {Number(props.potFire.adjScore).toFixed(2)} */}
          :&nbsp;
          <a href={props.potFire.annotatedUrl} target="_blank" rel="noopener noreferrer">Full image</a>
          {props.showProto && props.potFire.weatherScore &&
            <div className={(props.potFire.weatherScore > 0.3) ? "w3-pale-red" : ""}>
              Wscore: {props.potFire.weatherScore}
            </div>
          }
        </h5>
        {sideBySide ? (<div>
          <div className="w3-col m8">
            <TimeLapseVideo videoUrl={props.potFire.croppedUrl}/>
          </div>
          <div className="w3-col m4">
            {props.childComponent}
            <ZoomableMaps mapUrls={props.potFire.mapUrl}/>
          </div>
        </div>)
        : (<div>
            <TimeLapseVideo videoUrl={props.potFire.croppedUrl}/>
            {props.childComponent}
            <ZoomableMaps mapUrls={props.potFire.mapUrl}/>
        </div>)}
      </div>
      &nbsp;
    </div>
  );
}

/**
 * Show voting buttons (yes/no), or already cast vote, or signin link
 * @param {*} props
 */
export function VoteButtons(props) {
  const myLoc = useLocation();
  const myPath = myLoc.pathname;
if (!props.validCookie) {
    return (
    <div>
      <p style={{margin:0}}>
        <Link to={{pathname: '/login', query: {fwdPath: myPath} }}>Sign in</Link> to vote if this is a fire
      </p>
    </div>
    );
  } else if (props.potFire.voted !== undefined) {
    if (props.potFire.voted) {
      return <p>Thanks for confirming this is a real fire</p>;
    } else {
      return <p>Thanks for confirming this is not a fire</p>;
    }
  } else {
    return (
    <div>
      <p style={{margin:0}}>Is this a fire?</p>
      <div className="w3-tooltip w3-col m6 w3-right-align">
        <p className="tooltip-text" style={{width: '120px'}}>
          Wildfires and prescribed burns
        </p>
        <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> props.onVote(props.potFire, true)}>
          <i className="fa fa-fire" style={{color: "red"}} />
          &nbsp;Real fire
        </button>
      </div>
      <div className="w3-tooltip w3-col m6 w3-left-align">
        <p className="tooltip-text" style={{width: '120px'}}>
          Fog, clouds, chimney smoke, dust, and glare
        </p>
        <button className="w3-button w3-border w3-round-large w3-black" onClick={()=> props.onVote(props.potFire, false)}>
          <i className="fa fa-close" />
          &nbsp;Not a fire
        </button>
      </div>
    </div>
    );
  }
}
