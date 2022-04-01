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
  Redirect
} from "react-router-dom";
import './App.css';
import VoteFires from './VoteFires';
import ConfirmedFires from './ConfirmedFires';
import SelectedFires from './SelectedFires';
import DetectedFires from './DetectedFires';
import Preferences from './Preferences';
import LabelImage from './LabelImage';
import Prototypes from './Prototypes';

import googleSigninImg from './btn_google_signin_dark_normal_web.png';
import googleSigninImgFocus from './btn_google_signin_dark_focus_web.png';
import Cookies from 'js-cookie';
import jwt_decode from 'jwt-decode'
import {getServerUrl, Legalese, serverGet} from './OctReactUtils';

const qs = require('qs');

function FirePagesHeader(props) {
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
      <div className="w3-col s3 w3-block">
        {props.validCookie ?
          <span className="w3-button w3-disabled">Logged in</span>
        :
          <button style={{padding: 0, outline: "none", border: "none"}} onClick={props.signin}>
            <img src={googleSigninImg} alt="Sign in with Google"
              onMouseOver={e=>(e.currentTarget.src=googleSigninImgFocus)}
              onMouseOut={e=>(e.currentTarget.src=googleSigninImg)} />
          </button>
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

  checkCookie() {
    const cf_token = Cookies.get('cf_token');
    if (cf_token) {
      const decoded = jwt_decode(cf_token);
      const now = new Date().valueOf()/1000;
      console.log('now', now, decoded.exp, now < decoded.exp);
      const newState = {
        validCookie: now < decoded.exp
      }
      this.setState(newState);
    }
  }

  componentDidMount() {
    this.checkCookie();
    this.getOauthUrl();
    const queryParams = qs.parse(window.location.search, {ignoreQueryPrefix: true});
    // console.log('qp', queryParams);
    if (queryParams.redirect && (queryParams.redirect[0] === '/')) {
      console.log('redirecting to ', queryParams.redirect);
      this.setState({redirect: queryParams.redirect});
      return;
    }
  }

  async getOauthUrl () {
    const serverUrl = getServerUrl('/api/oauthUrl?path=' + encodeURIComponent(window.location.pathname));
    const oauthUrlResp = await serverGet(serverUrl);
    this.oauthUrl = await oauthUrlResp.text();
    // console.log('oauth url', this.oauthUrl);
  }

  async signin() {
    if (process.env.NODE_ENV === 'development') {
      const serverUrl = getServerUrl('/api/devlogin?email=secret@example.com');
      const resp = await serverGet(serverUrl);
      const serverRes = await resp.text();
      console.log('get res', serverRes);
      this.checkCookie();
    } else {
      window.location.href = this.oauthUrl;
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
          <FirePagesHeader validCookie={this.state.validCookie} signin={()=> this.signin()}/>
          <Switch>
            <Route path="/prototypes" exact component={Prototypes} />
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
                      signin={() => this.signin()} invalidateCookie={() => this.invalidateCookie()} />} />
          </Switch>
        </Router>
        <Legalese/>
      </div>
    );  
  }
}

export default App;
