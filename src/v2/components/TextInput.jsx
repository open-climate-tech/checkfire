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

import concatClassNames from '../modules/concatClassNames.mjs'

/**
 * @param {Object} props
 * @param {string} props.className - A list of CSS class names.
 * @param {string=} props.label - Optional label for the input field.
 * @param {string=} props.placeholder - Optional placeholder for the input field
 *     also used as accessible label if `label` isn’t specified.
 *
 * @returns {React.Element}
 */
export default function TextInput(props) {
  const {className, disabled, label, placeholder, ...otherProps} = props
  const classNames =
    concatClassNames(className, 'c7e-text-input', disabled && 'c7e-text-input--disabled')

  return 0,
  <label>
    { label
      ? <span className="c7e-text-input--label">{label}</span>
      : placeholder &&
        <span className="c7e-text-input--label" style={{position: 'absolute', left: -99999}}>{placeholder}</span>
    }
    <input type="text" placeholder={placeholder} disabled={disabled} className={classNames} {...otherProps}/>
  </label>
}
