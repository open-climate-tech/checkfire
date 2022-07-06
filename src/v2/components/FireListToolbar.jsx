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

import FireListPagination from './FireListPagination.jsx'
import FireListVoting from './FireListVoting.jsx'

/**
 * Provides a simple toolbar for the main app layout.
 *
 * @param {Object} props
 * @param {Object} props.toolbarRef - A mutable ref object whose `.current`
 *     value will be set to this toolbar’s container element.
 *
 * @returns {React.Element}
 */
export default function FireListToolbar(props) {
  const {toolbarRef, ...otherProps} = props

  return 0,
  <div ref={toolbarRef} className="c7e-fire-list--toolbar">
    <FireListVoting {...otherProps}/>
    <FireListPagination {...otherProps}/>
  </div>
}
