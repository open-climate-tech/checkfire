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
import trapEvent from '../modules/trapEvent.mjs';

/**
 * @param {Object} props
 * @param {string} props.children - The content to display in the overlay.
 * @param {funciton=} props.onClick - Optional callback to be invoked when the
 *     non-content area of the overlay is clicked.
 *
 * @returns {React.Element}
 */
export default function Overlay(props) {
  const { children, onClick } = props;

  return (
    0,
    (
      <div className="c7e-overlay" onClick={onClick}>
        <div className="c7e-overlay--background" />
        <div className="c7e-overlay--content" onClick={trapEvent}>
          {children}
        </div>
      </div>
    )
  );
}
