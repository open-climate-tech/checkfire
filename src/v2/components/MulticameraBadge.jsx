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

import React from 'react';

/**
 * Provides an HTML marker whose numerical content can be specified.
 *
 * @param {Object} props
 * @param {Icon=} props.count - The number of cameras involved.
 *
 * @returns {React.Element}
 */
export default function MulticameraBadge(props) {
  const { count = 1 } = props;

  return (
    0,
    (
      <div className="c7e-map--multicamera-badge">
        <div
          className="c7e-map--multicamera-badge--content"
          data-count={count}
        ></div>
      </div>
    )
  );
}

/**
 * Synchronously enders HTML equivalent to a `MulticameraBadge` React element,
 * which is all but necessary when using non-React 3rd-party packages such
 * as Leaflet.
 *
 * @see MulticameraBadge
 */
MulticameraBadge.render = function (props) {
  const { count = 1 } = props;

  // TODO: Add test to compare rendered string value to element instance.

  return `\
<div class="c7e-map--multicamera-badge">
 <div class="c7e-map--multicamera-badge--content" data-count=${count}></div>
</div>`;
};
