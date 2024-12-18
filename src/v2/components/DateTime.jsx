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

import renderDateTimeString from '../modules/renderDateTimeString.mjs';

/**
 * Provides a simple footer for the main app layout.
 *
 * @returns {React.Element}
 */
export default function DateTime(props) {
  const { date } = props;
  return (
    0,
    (
      <time dateTime={date.toISOString()} className="c7e-date-time">
        {renderDateTimeString(date)}
      </time>
    )
  );
}

/**
 * Synchronously renders HTML equivalent to a `DateTime` React element, which is
 * all but necessary when using non-React 3rd-party packages such as Leaflet.
 *
 * @see DateTime
 */
DateTime.render = function (props) {
  const { date } = props;
  return `\
<time datetime="${date.toISOString()}" class="c7e-date-time">
  ${renderDateTimeString(date)}
</time>`;
};
