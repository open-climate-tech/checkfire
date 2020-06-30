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

// Authenticate with Google Oauth -- this is prototype code that will be moved in the future

import React, { Component } from "react";
import googleSigninImg from './btn_google_signin_dark_normal_web.png';
import Cookies from 'js-cookie';
import jwt from 'jsonwebtoken';

class Auth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      validCookie: false,
    };
  }

  getServerUrl(path) {
    const serverPrefix = (process.env.NODE_ENV === 'development') ?
      `http://localhost:${process.env.REACT_APP_BE_PORT}` : '';
    return serverPrefix + path;
  }

  async getOauthUrl () {
    const serverUrl = this.getServerUrl('/api/oauthUrl?path=' + encodeURIComponent(window.location.pathname));
    const oauthUrlResp = await fetch(serverUrl);
    this.oauthUrl = await oauthUrlResp.text();
    console.log('got url', this.oauthUrl);
  }

  componentDidMount() {
    const cf_token = Cookies.get('cf_token');
    if (cf_token) {
      const decoded = jwt.decode(cf_token);
      const now = new Date().valueOf()/1000;
      console.log('now', now, decoded.exp, now < decoded.exp);
      this.setState({validCookie: now < decoded.exp});
    }
    this.getOauthUrl();
  }

  async handleClick(forceAuth=false) {
    console.log('hc vc', this.state.validCookie, forceAuth);
    if (this.state.validCookie && !forceAuth) {
      console.log('GET');
      let serverUrl = this.getServerUrl('/api/testGet');
      let resp = await fetch(serverUrl);
      console.log('get res', await resp.text());

      console.log('POST');
      serverUrl = this.getServerUrl('/api/testPost');
      resp = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({a: 1, b: 'foo'})
      });
      console.log('post res', await resp.text());
    } else {
      window.location.href = this.oauthUrl;
    }
  }

  forceAuth() {
    this.handleClick(true);
  }

  render() {
    return (
      <div>
        <h1>
          Auth
        </h1>
        <p>
          Auth when necessary
          <button onClick={()=> this.handleClick()}>
            {
              (this.state.validCookie) ? 'Vote' : <img src={googleSigninImg} alt="Sign in with Google" />
            }
          </button>
        </p>
        <p>
          Force auth
          <button onClick={()=> this.forceAuth()}>
            <img src={googleSigninImg} alt="Sign in with Google" />
          </button>
        </p>
      </div>
    );
  }
}

export default Auth;
