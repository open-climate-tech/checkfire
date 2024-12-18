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
  this.addEventListener = function (type, cb) {
    eventListeners[type] = cb;
  };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  this.close = function () {};
};

test('renders without crashing', () => {
  render(<App />);
});

test('renders Terms and Conditions', () => {
  const { getByText } = render(<App />);
  const disclaimerElt = getByText(/Terms and Conditions/);
  expect(disclaimerElt).toBeInTheDocument();
});

test('potential fire events are rendered', () => {
  const cameraID = 'cam1';
  const score = 0.6;
  const annotatedUrl = 'https://a.b/c1.jpg';
  const movieUrl = 'https://a.b/c1.mp4';
  const mapUrl = 'https://a.b/m1.jpg';
  let msg = {
    timestamp: Math.round(new Date().valueOf() / 1000) - 60, // one minute ago
    cameraID: cameraID,
    camInfo: { cameraName: cameraID },
    adjScore: score,
    annotatedUrl: annotatedUrl,
    croppedUrl: movieUrl,
    mapUrl: mapUrl,
  };
  let msgStr = JSON.stringify(msg);
  const { getByText, getByTestId } = render(<App />);
  eventListeners.newPotentialFire({ data: msgStr });

  const camElt = getByText(cameraID, { exact: false });
  expect(camElt).toBeInTheDocument();

  const fireElt = getByTestId('FireListElement');
  expect(fireElt).toBeInTheDocument();

  const href = getByText('Full image').closest('a').getAttribute('href');
  assert.strictEqual(href, annotatedUrl);

  const videoSrc = fireElt.querySelector('source').getAttribute('src');
  assert.strictEqual(videoSrc, movieUrl);

  const mapSrc = fireElt.querySelector('img').getAttribute('src');
  assert.strictEqual(mapSrc, mapUrl);
});
