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

import FireListMap from './FireListMap.jsx'
import FireListToolbar from './FireListToolbar.jsx'

/**
 * Provides layout for toolbar and map around the actual fire list content.
 *
 * @param {Object} props
 * @param {Object} props.toolbarRef - To be passed to and filled in by toolbar.
 *
 * @returns {React.Element}
 */
export default function FireListControl(props) {
  const {toolbarRef, ...otherProps} = props

  return 0,
  <div className="c7e-fire-list--control">
    <FireListToolbar toolbarRef={toolbarRef} {...otherProps}/>
    <FireListMap {...otherProps}/>
  </div>
}
