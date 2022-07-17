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
 * Provides a button-like element intended to be included within a button group
 * to display non-button information such as pagination state text.
 *
 * @param {Object} props
 * @param {string} props.className - A list of CSS class names.
 * @param {boolean} props.disabled - Whether users should be able to interact
 *     with this button.
 * @param {Icon=} props.icon - Optional icon to include with the button.
 * @param {string=} props.label - Optional label to include with the button.
 *
 * @returns {React.Element}
 */
export default function ButtonOutput(props) {
  const {className, disabled, icon, label} = props
  const classNames =
    concatClassNames(className, 'c7e-button-output', disabled && 'c7e-button--disabled')

  return 0,
  <span className={classNames}>
    { icon &&
      <Icon className="c7e-button--icon" icon={icon}/>
    }
    { label &&
      <span className="c7e-button--label">{label}</span>
    }
  </span>
}
