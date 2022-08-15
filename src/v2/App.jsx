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

import React, {useCallback, useEffect, useState} from 'react'

import AppFooter from './components/AppFooter.jsx'
import Authentication from './components/Authentication.jsx'
import PotentialFireList from './components/PotentialFireList.jsx'

import './App.css'

export default function App() {
  const [authnTitle, setAuthnTitle] = useState()
  const [handleAuthenticated, setHandleAuthenticated] = useState(null)
  const [shouldShowAuthn, setShouldShowAuthn] = useState(false)

  const handleToggleAuthn = useCallback((title = null, fn = null, hide = false) => {
    // XXX: Functions aren’t state. They return state. So wrap and return `fn`.
    // See: https://reactjs.org/docs/hooks-reference.html#functional-updates
    setHandleAuthenticated(() => fn)
    setAuthnTitle(title != null ? title : undefined)
    setShouldShowAuthn(hide === true ? false : !shouldShowAuthn)
  }, [shouldShowAuthn])

  // XXX: Reset scroll position on page load. Otherwise, the window may be
  // scrolled a couple hundred pixels down (not sure why).
  useEffect(() => {
    ;(function check() {
      /complete/.test(document.readyState)
        // XXX: Set scroll position asynchronously; otherwise, as observed,
        // scroll position setting isn’t guaranteed to take effect.
        ? requestAnimationFrame(() => window.scrollTo(0, 0))
        : setTimeout(check)
    })()
  }, [])

  return 0,
  <div className="c7e-root">
    { shouldShowAuthn &&
      <Authentication onAuthenticated={handleAuthenticated} onCancel={handleToggleAuthn} title={authnTitle}/>
    }
    <PotentialFireList onToggleAuthn={handleToggleAuthn}/>
    <AppFooter/>
  </div>
}
