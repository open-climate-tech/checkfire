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

// Register page

import React, { useState } from 'react';
import { getServerUrl, serverPost } from './OctReactUtils';

import { useLocation } from 'react-router-dom';

export default function Register(props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [errMessage, setErrMessage] = useState('');

  const location = useLocation();
  const fwdPath = (location.query && location.query.fwdPath) || '/';
  // console.log('Register fwdPath', fwdPath);

  const registerSubmit = async (event) => {
    event.preventDefault();
    const registerUrl = getServerUrl('/api/register');
    const registerRespText = await serverPost(registerUrl, {
      username: username,
      password: password,
      email: email,
    });
    console.log('Register resp', registerRespText);
    setErrMessage(registerRespText === 'success' ? '' : 'Incorrect username');
    if (registerRespText === 'success') {
      window.location.href = fwdPath;
    }
  };

  return (
    <div>
      <div className="w3-container w3-light-grey">
        <div className="w3-row w3-content" style={{ maxWidth: '600px' }}>
          <h2 style={{ textAlign: 'center' }}>Register</h2>
          <form onSubmit={registerSubmit}>
            <section>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Username"
                required
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </section>
            <section>
              <input
                id="current-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </section>
            <section>
              <input
                id="current-email"
                name="email"
                type="text"
                autoComplete="email"
                placeholder="Email (used for account recovery)"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </section>
            <input type="submit" value="Sign up" />
            {errMessage || <span>&nbsp;</span>}
          </form>
        </div>
      </div>
    </div>
  );
}
