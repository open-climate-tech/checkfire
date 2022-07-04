/*
# Copyright 2022 Open Climate Tech Contributors
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

// Login page

import './Login.css';
import React, {useState, useEffect} from "react";
import {useLocation, Link} from 'react-router-dom';
import {getServerUrl, serverGet, serverPost} from './OctReactUtils';

import googleSigninImg from './btn_google_signin_dark_normal_web.png';
import googleSigninImgFocus from './btn_google_signin_dark_focus_web.png';


export default function Login(props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errMessage, setErrMessage] = useState("");

  const location = useLocation();
  const fwdPath = (location.query && location.query.fwdPath) || '/';
  console.log('Login fwdPath', fwdPath);

  async function loginPassword(event) {
    event.preventDefault();
    const localAuthUrl = getServerUrl('/api/loginPassword');
    const localAuthRespText = await serverPost(localAuthUrl, {username: username, password: password});
    setErrMessage((localAuthRespText === 'success') ? '' : 'Incorrect username or password');
    if (localAuthRespText === 'success') {
      window.location.href = fwdPath;
    }
  };

  async function loginGoogle(fwdPath) {
    const fwdPath2 = fwdPath || '/';
    console.log('loginGoogle fwd ', fwdPath2);
    if (process.env.NODE_ENV === 'development') {
      const serverUrl = getServerUrl('/api/devlogin?email=secret@example.com');
      const resp = await serverGet(serverUrl);
      const serverRes = await resp.text();
      console.log('get res', serverRes);
      window.location.href = fwdPath2;
    } else {
      window.location.href = getServerUrl('/api/oauthUrl?path=' + fwdPath2);
    }
  }

  return (
    <div>
      <div className="container">
        <div className="row">
          <h2 style={{textAlign:"center"}}>Sign in</h2>
          <div className="vl">
            <span className="vl-innertext">or</span>
          </div>

          <div className="col">
            <button style={{padding: 0, outline: "none", border: "none"}} onClick={()=> loginGoogle(fwdPath)}>
              <img src={googleSigninImg} alt="Sign in with Google"
                onMouseOver={e=>(e.currentTarget.src=googleSigninImgFocus)}
                onMouseOut={e=>(e.currentTarget.src=googleSigninImg)} />
            </button>
            {/* <a href="/#" class="fb btn">
              <i class="fa fa-facebook fa-fw"></i> Login with Facebook
            </a>
            <a href="/#" class="twitter btn">
              <i class="fa fa-twitter fa-fw"></i> Login with Twitter
            </a> */}
          </div>

          <div className="col">
            <div className="hide-md-lg">
              <p>Or sign in manually:</p>
            </div>

            <form onSubmit={loginPassword}>
              <section>
                <input id="username" name="username" type="text" autoComplete="username" placeholder="Username" required autoFocus
                  value={username} onChange={event => setUsername(event.target.value)} />
              </section>
              <section>
                <input id="current-password" name="password" type="password" autoComplete="current-password" placeholder="Password" required
                  value={password} onChange={event => setPassword(event.target.value)} />
              </section>
              <input type="submit" value="Login"/>
              {errMessage || <span>&nbsp;</span>}
            </form>
            <Link to={{ pathname: '/register', query: {fwdPath: fwdPath} }}>Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
