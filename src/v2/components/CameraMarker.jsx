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

/**
 * Provides an icon marker whose bearing (rotation) can be specified.
 *
 * @param {Object} props
 * @param {Icon=} props.icon - Optional icon to use as the marker; defaults to
 *     `'c7e-icon--potential-fire'`.
 *
 * @returns {React.Element}
 */
export default function CameraMarker(props) {
  const {bearing = 0, icon = 'c7e-icon--potential-fire'} = props
  const styles = {
    left: '50%',
    position: 'absolute',
    top: '50%',
    transform: `rotate(${bearing}deg) translate(-50%, -50%)`,
    transformOrigin: 'top left'
  }

  return 0,
  <Icon className="c7e-map--marker" icon={icon} style={styles}/>
}
