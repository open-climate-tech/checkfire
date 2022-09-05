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

import React, {useCallback, useState} from 'react'

import Button from './Button.jsx'
import Overlay from './Overlay.jsx'
import TextInput from './TextInput.jsx'

import getUrl from '../modules/getUrl.mjs'
import query from '../modules/query.mjs'

/**
 * @param {Object} props
 * @param {string} props.className - A list of CSS class names.
 * @param {function} props.onAuthenticated - Callback to invoke when the user
 *     authenticates successfully.
 * @param {function} props.onCancel - Callback to invoke when the user dismisses
 *     the authentication dialog.
 * @param {string=} props.title - Optional title (defaults to `'Sign in'`).
 *
 * @returns {React.Element}
 */
export default function Authentication(props) {
  const {onAuthenticated, onCancel, title = 'Sign in'} = props

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState('authentication')

  const handleChange = useCallback(({target: {name, value}}) => {
    switch (name) {
      case 'email': return setEmail(value)
      case 'password': return setPassword(value)
      case 'username': return setUsername(value)
      default: throw new Error(`Unexpected input: ${name}`)
    }
  }, [])

  const handleCredentials = useCallback((event) => {
    event.preventDefault()
    setMessage('')

    setTimeout(() => query
      .post('/api/loginPassword', {username, password})
      .then(onAuthenticated)
      .catch(() => {
        setMessage('Incorrect username or password')
      }), 250) // Give user time to perceive submission and error state changes.
  }, [onAuthenticated, password, username])

  const handleFacebook = useCallback(() => {
    const oauthUrl = getUrl(`/api/oauthFbUrl?path=%2Fauthenticated`)
    const w = window.open(oauthUrl, 'c7e.authentication')
    window.c7e = window.c7e || {}
    window.c7e.authnCallback = () => {
      onAuthenticated()
      w.close()
    }
  }, [onAuthenticated])

  const handleGoogle = useCallback(() => {
    let oauthUrl = '/api/oauthUrl'
    let params = '?path=/authenticated'

    if (process.env.NODE_ENV === 'development') {
      const {host, protocol} = window.location
      oauthUrl = '/api/oauthDevUrl'
      params = `${params}&host=${host}&protocol=${protocol}`
    }

    const w = window.open(getUrl(`${oauthUrl}${params}`), 'c7e.authentication')
    window.c7e = window.c7e || {}
    window.c7e.authnCallback = () => {
      onAuthenticated()
      w.close()
    }
  }, [onAuthenticated])

  const handleRegistration = useCallback((event) => {
    event.preventDefault()
    setMessage('')

    setTimeout(() => query
      .post('/api/register', {email, username, password})
      .then(onAuthenticated)
      .catch((error) => {
        if (error.status === 409) {
          setMessage('Username already exists')
        } else {
          setMessage('Oops… something went wrong, please try again')
        }
      }), 250) // Give user time to perceive submission and error state changes.
  }, [email, onAuthenticated, password, username])

  const handleMode = useCallback((nextMode) => {
    if (mode !== nextMode) {
      setEmail('')
      setUsername('')
      setPassword('')
      setMessage('')
      setMode(nextMode)
    }
  }, [mode])

  const disabled = password === '' || username === ''

  return 0,
  <Overlay onClick={onCancel}>
    <div className="c7e-authentication">
      <h2 className="c7e-authentication--title">{title}</h2>
      <div className="c7e-authentication--oauth">
        <Button className="c7e-authentication--button" icon="c7e-logomark--google-g" label="Sign in with Google" onClick={handleGoogle}/>
        <Button className="c7e-authentication--button" icon="c7e-logomark--facebook-f" label="Sign in with Facebook" onClick={handleFacebook}/>
      </div>
      <div className="c7e-authentication--divider">
        <div className="c7e-authentication--divider-label">or</div>
      </div>
      <div className="c7e-authentication--tabs">
        <div className={`c7e-authentication--tab${mode === 'authentication' ? ' c7e-selected' : ''}`} onClick={() => handleMode('authentication')}>Sign in</div>
        <div className={`c7e-authentication--tab${mode === 'registration' ? ' c7e-selected' : ''}`} onClick={() => handleMode('registration')}>Sign up</div>
      </div>
      { mode === 'authentication' &&
        <form className="c7e-authentication--credentials" onSubmit={handleCredentials}>
          { message && <div className="c7e-authentication--message">{message}</div> }
          <TextInput name="username" id="username" autoComplete="username" placeholder="Username" onChange={handleChange}/>
          <TextInput type="password" name="password" id="current-password" autoComplete="current-password" placeholder="Password" onChange={handleChange}/>
          <Button type="submit" disabled={disabled} className="c7e-authentication--button" label="Sign in" onClick={handleCredentials}/>
        </form>
      }
      { mode === 'registration' &&
        <form className="c7e-authentication--credentials" onSubmit={handleRegistration}>
          { message && <div className="c7e-authentication--message">{message}</div> }
          <TextInput name="username" id="username" autoComplete="username" placeholder="Username" onChange={handleChange}/>
          <TextInput type="password" name="password" id="new-password" autoComplete="new-password" placeholder="Password" onChange={handleChange}/>
          <TextInput type="email" name="email" id="email" autoComplete="email" placeholder="Email address for account recovery" onChange={handleChange}/>
          <Button type="submit" disabled={disabled} className="c7e-authentication--button" label="Sign up" onClick={handleRegistration}/>
        </form>
      }
    </div>
  </Overlay>

  // TODO:
  //   - Implement registration.
}
