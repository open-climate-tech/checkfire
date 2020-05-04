/*
# Copyright 2020 Open Climate Tech Contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
*/

import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
const chai = require('chai');
const assert = chai.assert;

var eventListeners = {};

// create a mock EventSource
global.EventSource = function MockEventSource(url) {
  this.addEventListener = function(type, cb) {
    eventListeners[type] = cb;
  }
}

test('renders without crashing', () => {
  render(<App />);
});

test('renders Disclaimer', () => {
  const { getByText } = render(<App />);
  const disclaimerElt = getByText(/Disclaimer/);
  expect(disclaimerElt).toBeInTheDocument();
});

test('potential fire events are rendered', () => {
  const cameraID = 'cam1';
  const score = 0.6;
  const annotatedUrl = 'https://a.b/c.jpg';
  let msg = {
    'timestamp': 1,
    'cameraID': cameraID,
    "adjScore": score,
    'annotatedUrl': annotatedUrl,
  };
  let msgStr = JSON.stringify(msg);
  const { getByText, getByTestId } = render(<App />);
  eventListeners.newPotentialFire({data: msgStr});
  // let elt = getByText('Potential fire', { exact: false });
  // expect(elt).toBeInTheDocument();

  // assert(elt.textContent.includes(cameraID));
  // assert(elt.textContent.includes(score.toString()));

  let elt = getByText(cameraID, { exact: false });
  expect(elt).toBeInTheDocument();

  elt = getByText(score.toString(), { exact: false });
  expect(elt).toBeInTheDocument();

  elt = getByTestId('FireListElement');
  expect(elt).toBeInTheDocument();

  const href = elt.querySelector('a').getAttribute('href');
  assert.strictEqual(href, annotatedUrl);

  const imgSrc = elt.querySelector('img').getAttribute('src');
  assert.strictEqual(imgSrc, annotatedUrl);
});
