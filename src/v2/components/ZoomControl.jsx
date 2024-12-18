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

/**
 * @returns {React.Element}
 */
export default function ZoomControl(props) {
  const { container, map } = props;

  const jsx = useMemo(() => {
    if (map == null) {
      return null;
    }

    const zoomIn = (event) => {
      trapEvent(event);
      map.zoomIn();
      map.getContainer().focus();
    };

    const zoomOut = (event) => {
      trapEvent(event);
      map.zoomOut();
      map.getContainer().focus();
    };

    const types =
      'onContextMenu onDragStart onDoubleClick onMouseDown onTouchStart';
    const traps = trapEvents(types, { draggable: true });

    return (
      0,
      (
        <div className="c7e-map--control">
          <ButtonGroup className="c7e-map--control--zoom">
            <IconButton
              icon="c7e-icon--zoom-in"
              label="Zoom in"
              title="Zoom in"
              onClick={zoomIn}
              {...traps}
            />
            <IconButton
              icon="c7e-icon--zoom-out"
              label="Zoom out"
              title="Zoom out"
              onClick={zoomOut}
              {...traps}
            />
          </ButtonGroup>
        </div>
      )
    );
  }, [map]);

  return container != null ? ReactDOM.createPortal(jsx, container) : jsx;
}
