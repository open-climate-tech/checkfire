// -----------------------------------------------------------------------------
// Copyright 2020 Open Climate Tech Contributors
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

import { expect } from 'chai';

import isLineWithinLongitudes from '../../../src/v2/modules/isLineWithinLongitudes.mjs';

describe('isLineWithinLongitudes()', () => {
  it('should return true', () => {
    const line = [
      [33.2, -116.8],
      [32.6, -117.0],
    ];
    const east = -116.6;
    const west = -117.1;
    const latitude = 33;

    const actual = isLineWithinLongitudes(line, east, west, latitude);
    expect(actual).to.be.true;
  });

  it('should return false', () => {
    const line = [
      [33.1, -116.6],
      [33.0, -116.5],
    ];
    const east = -116.6;
    const west = -117.1;
    const latitude = 33;

    const actual = isLineWithinLongitudes(line, east, west, latitude);
    expect(actual).to.be.false;
  });
});
