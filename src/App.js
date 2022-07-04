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

import React, { Component } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect,
  useLocation
} from "react-router-dom";
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

import V2 from './v2/App.jsx'

import {getServerUrl, Legalese, serverGet} from './OctReactUtils';

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
  '/register'
]

function FirePagesHeader(props) {
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
  return (<div>
    <div className="w3-bar w3-wide w3-padding w3-card">
      <div className="w3-col s3 w3-button w3-block">
        <Link to='/wildfirecheck'>Potential fires</Link>
      </div>
      <div className="w3-col s3 w3-button w3-block">
        <Link to='/confirmed'>Confirmed fires</Link>
      </div>
      <div className="w3-col s3 w3-button w3-block">
        <Link to='/preferences'>Preferences</Link>
      </div>
      <div className="w3-col s3 w3-button w3-block">
        {props.validCookie ?
          <button className={"w3-black w3-round-large"} onClick={() => logout()}>
            Sign off
          </button>
        :
        <Link to={{ pathname: '/login', query: {fwdPath: myPath} }}>Sign in</Link>
      }
      </div>
    </div>
  </div>);
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      validCookie: false
    };
  }

  async checkCookie() {
    const serverUrl = getServerUrl('/api/checkAuth');
    const authResp = await serverGet(serverUrl);
    const authText = await authResp.text();
    console.log('checkAuth resp', authText);
    this.setState({
      validCookie: authText === 'success',
    });
  }

  componentDidMount() {
    this.checkCookie();
    const queryParams = qs.parse(window.location.search, {ignoreQueryPrefix: true});
    // console.log('qp', queryParams);
    if (queryParams.redirect && (queryParams.redirect[0] === '/')) {
      console.log('redirecting to ', queryParams.redirect);
      this.setState({redirect: queryParams.redirect});
      return;
    }
  }

  invalidateCookie() {
    this.setState({validCookie: false});
  }

  render() {
    return (
      <div className="App">
        <Router>
          {
            (this.state.redirect && <Redirect to={this.state.redirect} />)
          }
          <Route path={LEGACY_PATHS} exact>
            <FirePagesHeader validCookie={this.state.validCookie} />
          </Route>
          <Switch>
            <Route path="/v2/wildfirecheck" exact component={V2} />
            <Route path="/prototypes" exact component={Prototypes} />
            <Route path="/login" exact render={props =>
                    <Login />} />
            <Route path="/register" exact render={props =>
                    <Register />} />
            <Route path="/confirmed" exact render={props =>
                    <ConfirmedFires {...props} />} />
            <Route path="/selected" exact render={props =>
                    <SelectedFires {...props} />} />
            <Route path="/detected" exact render={props =>
                    <DetectedFires {...props} />} />
            <Route path="/preferences" exact render={props =>
                    <Preferences {...props} validCookie={this.state.validCookie} />} />
            <Route path="/labelImage" exact render={props =>
                    <LabelImage {...props} validCookie={this.state.validCookie} />} />
            <Route path={["/", "/wildfirecheck"]} render={props =>
                    <VoteFires {...props} validCookie={this.state.validCookie}
                      invalidateCookie={() => this.invalidateCookie()} />} />
          </Switch>
          <Route path={LEGACY_PATHS} exact>
            <Legalese/>
          </Route>
        </Router>
      </div>
    );
  }
}

export default App;
