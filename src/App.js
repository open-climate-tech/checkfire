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

// React frontend

import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import './App.css';
import VoteFires from './VoteFires';
import ConfirmedFires from './ConfirmedFires';
import SelectedFires from './SelectedFires';
import DetectedFires from './DetectedFires';
import Preferences from './Preferences';
import LabelImage from './LabelImage';
import Login from './Login';
import Register from './Register';

import Prototypes from './Prototypes';

import Authenticated from './v2/components/Authenticated.jsx';
import V2 from './v2/App.jsx';

import { getServerUrl, Legalese, serverGet } from './OctReactUtils';

const qs = require('qs');

const LEGACY_PATHS = [
  '/',
  '/confirmed',
  '/detected',
  '/labelImage',
  '/preferences',
  '/prototypes',
  '/selected',
  '/wildfirecheck',
  '/login',
  '/register',
];

function FirePagesHeader(props) {
  const navigate = useNavigate();

  async function logout() {
    const serverUrl = getServerUrl('/api/logout');
    const logoutResp = await serverGet(serverUrl);
    const logoutText = await logoutResp.text();
    console.log('logout ret', logoutText);
    if (logoutText === 'success') {
      window.location.reload();
    }
  }
  const myLoc = useLocation();
  const myPath = myLoc.pathname;

  async function login() {
    navigate({
      pathname: '/login',
      search: `?fwdPath=${myPath}`,
    });
  }

  return (
    <div>
      <div className="w3-bar w3-wide w3-padding w3-card">
        <div className="w3-col s3 w3-button w3-block">
          <Link to="/wildfirecheck">Potential fires</Link>
        </div>
        <div className="w3-col s3 w3-button w3-block">
          <Link to="/confirmed">Confirmed fires</Link>
        </div>
        <div className="w3-col s3 w3-button w3-block">
          <Link to="/preferences">Preferences</Link>
        </div>
        <div className="w3-col s3 w3-button w3-block">
          {props.validCookie ? (
            <button
              className={'w3-black w3-round-large'}
              onClick={() => logout()}
            >
              Sign off
            </button>
          ) : (
            <button
              className={'w3-black w3-round-large'}
              onClick={() => login()}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RedirectTo(props) {
  const navigate = useNavigate();
  useEffect(() => {
    if (props.path && props.path.length) {
      console.log('redirecting to ', props.path);
      navigate(props.path);
      props.setRedirectPath('');
    }
  }, [navigate, props, props.path]);
  return null;
}

export default function App(props) {
  const [validCookie, setValidCookie] = useState(false);
  const [redirectPath, setRedirectPath] = useState('');

  const checkCookie = async function () {
    const serverUrl = getServerUrl('/api/checkAuth');
    const authResp = await serverGet(serverUrl);
    const authText = await authResp.text();
    console.log('checkAuth resp', authText);
    setValidCookie(authText === 'success');
  };

  useEffect(() => {
    checkCookie();
  }, []);

  useEffect(() => {
    const queryParams = qs.parse(window.location.search, {
      ignoreQueryPrefix: true,
    });
    // console.log('app UE qp', queryParams);
    if (queryParams.redirect && queryParams.redirect[0] === '/') {
      console.log('redirecting to ', queryParams.redirect);
      setRedirectPath(queryParams.redirect);
    }
  }, []);

  return (
    <div className="App">
      <Router>
        {redirectPath && (
          <RedirectTo path={redirectPath} setRedirectPath={setRedirectPath} />
        )}
        <Routes>
          {LEGACY_PATHS.map((p) => (
            <Route
              path={p}
              exact
              key={p}
              element={<FirePagesHeader validCookie={validCookie} />}
            />
          ))}
          <Route path="/v2/*" exact element={<span />} />
        </Routes>
        <Routes>
          <Route path="/v2/wildfirecheck" exact element={<V2 />} />
          <Route
            path="/v2/wildfirecheck/preferences"
            exact
            element={<V2 prefs={true} />}
          />
          <Route path="/authenticated" exact element={<Authenticated />} />
          <Route path="/prototypes" exact element={<Prototypes />} />
          <Route path="/login" exact element={<Login />} />
          <Route path="/register" exact element={<Register />} />
          <Route
            path="/confirmed"
            exact
            element={<ConfirmedFires {...props} />}
          />
          <Route
            path="/selected"
            exact
            element={<SelectedFires {...props} />}
          />
          <Route
            path="/detected"
            exact
            element={<DetectedFires {...props} />}
          />
          <Route
            path="/preferences"
            exact
            element={<Preferences {...props} validCookie={validCookie} />}
          />
          <Route
            path="/labelImage"
            exact
            element={<LabelImage {...props} validCookie={validCookie} />}
          />
          <Route
            path="/"
            element={<VoteFires {...props} validCookie={validCookie} />}
          />
          <Route
            path="/wildfirecheck"
            element={<VoteFires {...props} validCookie={validCookie} />}
          />
        </Routes>
        <Routes>
          {LEGACY_PATHS.map((p) => (
            <Route path={p} exact key={p} element={<Legalese />} />
          ))}
          <Route path="/v2/*" exact element={<span />} />
        </Routes>
      </Router>
    </div>
  );
}
