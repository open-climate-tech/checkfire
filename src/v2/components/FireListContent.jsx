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

import Fire from './Fire.jsx'

/**
 * Provides a container for the list of fires, displaying a message while the
 * fires load or in the even that there are no fires to display.
 *
 * @param {Object} props
 * @param {Array} fires - The list of fires to display.
 * @param {boolean} loading - Whether the list of fires is still paging in.
 *
 * @returns {React.Element}
 */
export default function FireListContent(props) {
  const {fires, loading, ...other} = props

  return 0,
  <div className="c7e-fire-list--content">
    { loading === true &&
      <div className="c7e-fire-list--loading">Loading{fires.length > 0 && ` ${fires.length}`}…</div>
    }
    { loading === false && fires.length > 0 &&
      fires.map((x, i) =>
        <Fire key={`${x.cameraID}:${x.timestamp}`} fire={x} index={i} {...other}/>)
    }
  </div>
}
