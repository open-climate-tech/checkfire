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

import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';

import trapEvent from '../modules/trapEvent.mjs';
import trapEvents from '../modules/trapEvents.mjs';

import ButtonGroup from './ButtonGroup.jsx';
import IconButton from './IconButton.jsx';
import ZoomControl from './ZoomControl.jsx';

export default function RegionMaskControl(props) {
  const { container, map } = props;

  const jsx = useMemo(() => {
    if (map == null) {
      return null;
    }

    const openPrefs = (event) => {
      trapEvent(event);
      window.location.replace('/v2/wildfirecheck/preferences');
    };

    const types =
      'onContextMenu onDragStart onDoubleClick onMouseDown onTouchStart';
    const traps = trapEvents(types, { draggable: true });

    return (
      0,
      (
        <div className="c7e-map--control">
          <ButtonGroup className="c7e-map--control--preferences">
            <IconButton
              icon="c7e-icon--select-all"
              label="Select all"
              title="Select all"
              onClick={openPrefs}
              {...traps}
            />
          </ButtonGroup>

          <ZoomControl map={map} />
        </div>
      )
    );
  }, [map]);

  return container != null ? ReactDOM.createPortal(jsx, container) : jsx;
}
