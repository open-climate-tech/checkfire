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

import React, { useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';

import query from '../modules/query.mjs';

import IconButton from './IconButton.jsx';

export default function AuthnControl(props) {
  const { container, isAuthenticated, map, onToggleAuthn } = props;

  const signIn = useCallback(() => {
    onToggleAuthn('Sign in', () => onToggleAuthn(null, null, true));
  }, [onToggleAuthn]);

  const signOut = useCallback(() => {
    query.get('/api/logout').then(() => window.location.reload());
  }, []);

  const jsx = useMemo(() => {
    if (map == null) {
      return null;
    }

    return (
      0,
      (
        <div className="c7e-map--control">
          {isAuthenticated ? (
            <IconButton
              icon="c7e-icon--sign-out"
              label="Sign out"
              title="Sign out"
              onClick={signOut}
            />
          ) : (
            <IconButton
              icon="c7e-icon--sign-in"
              label="Sign in"
              title="Sign in"
              onClick={signIn}
            />
          )}
        </div>
      )
    );
  }, [isAuthenticated, map, signIn, signOut]);

  return container != null ? ReactDOM.createPortal(jsx, container) : jsx;
}
