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

import {expect} from 'chai'

import isLineWithinLatitudes from '../../../src/v2/modules/isLineWithinLatitudes.mjs'

describe('isLineWithinLatitudes()', () => {
  it("should return true", () => {
    const line = [[32.9, -117.2], [33.1, -116.7]]
    const north = 33
    const south = 32.7
    const longitude = -117.1

    const actual = isLineWithinLatitudes(line, north, south, longitude)
    expect(actual).to.be.true
  })

  it("should return false", () => {
    const line = [[33.1, -116.6], [32.6, -116.5]]
    const north = 33
    const south = 32.7
    const longitude = -117.1

    const actual = isLineWithinLatitudes(line, north, south, longitude)
    expect(actual).to.be.false
  })
})
