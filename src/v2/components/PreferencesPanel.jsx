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
import IconButton from './IconButton.jsx'

import concatClassNames from '../modules/concatClassNames.mjs'

export default function PreferencesPanel(props) {
  const {
    link, map, message, onCancel, onSave, onUpdate, prefs: {shouldNotify = false}
  } = props

  const [isFolded, setIsFolded] = useState(false)

  const handleCancel = useCallback((event) => {
    event.preventDefault()
    onCancel()
  }, [onCancel])

  const handleFold = useCallback(() => {
    setIsFolded(!isFolded)
  }, [isFolded])

  const handleSave = useCallback((event) => {
    event.preventDefault()
    onSave()
  }, [onSave])

  const handleShouldNotify = useCallback(() => {
    onUpdate({shouldNotify: !shouldNotify})
  }, [onUpdate, shouldNotify])

  if (map == null) {
    return null
  }

  return 0,
  <div className="c7e-map--control">
    <div className={concatClassNames('c7e-preferences-panel c7e-dialog', isFolded && 'c7e-dialog--is-folded')}>
      <IconButton className="c7e-dialog--fold" icon={isFolded ? 'c7e-icon--fold-more' : 'c7e-icon--fold-less'} label={isFolded ? 'Unfold panel' : 'Fold panel'} onClick={handleFold}/>

      <div style={{display: isFolded ? 'none' : 'block'}}>
        <h2 className="c7e-dialog--title">Preferences</h2>

        { message && <div className="c7e-dialog--message">{message}</div> }

        <p><strong>You are monitoring potential fires in the highlighted area.</strong></p>

        <p><Button className="c7e-dialog--button c7e-fill-width" icon={shouldNotify ? 'c7e-icon--notifications-on' : 'c7e-icon--notifications-off'} label={shouldNotify ? 'Notifications are on' : 'Notifications are off'} onClick={handleShouldNotify}/></p>

        <p>Click and drag the blue handles to designate an area familiar to you, which you prefer to monitor.</p>

        <div className="c7e-preferences-panel--region-mask-instructions">
          <div>
            <svg width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M1 16a15 15 0 1 0 30 0 15 15 0 0 0-30 0Z" fill="#C00" fillOpacity=".07" stroke="#C00" strokeOpacity=".13" strokeLinecap="round" strokeLinejoin="round"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M14 16.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0" fill="#C00" fillOpacity=".73"/>
              <path d="M14 16.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0" stroke="#C00" strokeOpacity=".93" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div>
            <p>Each camera should be able to detect fires within a 20-mile radius. Actual coverage depends on terrain occlusions and atmospheric visibility.</p>
          </div>
        </div>

        <form className="c7e-dialog--credentials" onSubmit={handleSave}>
          <div className="c7e-dialog--button-row">
            <Button className="c7e-dialog--button" aria-label="Open new tab with these preferences" icon="c7e-icon--link" href={link} target="blank" rel="noopener noreferrer"/>
            <div>
              <Button className="c7e-dialog--button" label="Cancel" onClick={handleCancel} style={{minWidth: 88}}/>
              <Button type="submit" className="c7e-dialog--button" label="Save" onClick={handleSave} style={{minWidth: 88}}/>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
}
