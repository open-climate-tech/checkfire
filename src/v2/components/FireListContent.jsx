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

import React from 'react'

import Button from './Button.jsx'
import Fire from './Fire.jsx'

import getCameraKey from '../modules/getCameraKey.mjs'

/**
 * Provides a container for the list of fires, displaying a message in the event
 * that there are no fires to display.
 *
 * @param {Object} props
 * @param {Array} props.fires - The list of fires to display.
 * @param {number} props.indexOfOldFires - The index in `props.fires` where old
 *     fires begin (-1 if `props.fires` doesn’t currently contain older fires).
 * @param {number} props.nOldFires - The total number of old fires, regardless
 *     of whether they are currently displayed or not.
 * @param {function()} props.onToggleAllFires - Callback to hide/show old fires.
 *
 * @returns {React.Element}
 */
export default function FireListContent(props) {
  const {fires, indexOfOldFires, nOldFires, onToggleAllFires, ...other} = props

  const oldFires = indexOfOldFires > -1 ? fires.slice(indexOfOldFires) : []
  const nFires = fires.length - oldFires.length

  return 0,
  <div className="c7e-fire-list--content">
    { nFires > 0 &&
      fires.slice(0, nFires).map((x, i) =>
        <Fire key={getCameraKey(x)} fire={x} index={i} {...other}/>)
    }

    <div className="c7e-fire-list--empty">
      { nOldFires < 1 && nFires < 1 &&
        <Button disabled label="There are no recent fires"/>
      }
      { nOldFires > 0 && indexOfOldFires < 0 &&
        <Button label={`Show ${nOldFires} older fires`} onClick={onToggleAllFires}/>
      }
      { nOldFires > 0 && indexOfOldFires > -1 &&
        <Button label={`Hide ${nOldFires} older fires`} onClick={onToggleAllFires}/>
      }
    </div>

    { oldFires.length > 0 > 0 &&
      oldFires.map((x, i) =>
        <Fire key={getCameraKey(x)} fire={x} index={indexOfOldFires + i} {...other}/>)
    }
  </div>
}
