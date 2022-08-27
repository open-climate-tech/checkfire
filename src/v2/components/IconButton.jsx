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

import Icon from './Icon.jsx'

import concatClassNames from '../modules/concatClassNames.mjs'

/**
 * @param {Object} props
 * @param {string} props.className - A list of CSS class names.
 * @param {string} props.icon - Icon ID to include with the button.
 * @param {string} props.label - Acessible text to include with the button.
 *
 * @returns {React.Element}
 */
export default function IconButton(props) {
  const {className, disabled, icon, label, ...otherProps} = props
  const classNames =
    concatClassNames(className, 'c7e-icon-button', disabled && 'c7e-icon-button--disabled')

  return 0,
  <button aria-label={label} disabled={disabled} className={classNames} {...otherProps}>
    <Icon className="c7e-icon-button--icon" icon={icon}/>
  </button>
}
