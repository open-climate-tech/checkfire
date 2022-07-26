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

import {expect} from 'chai'

import arePolygonsEqual from '../../../src/v2/modules/arePolygonsEqual.mjs'

describe('arePolygonsEqual()', () => {
  it('should be equal', () => {
    const a = [
      [32.8403, -117.249],
      [33.37490391451302, -116.97660570015627],
      [33.42492203887114, -117.11402936739367],
      [32.8403, -117.249]
    ]

    const b = [
      [32.8403, -117.249],
      [33.37490391451302, -116.97660570015627],
      [33.42492203887114, -117.11402936739367],
      [32.8403, -117.249]
    ]

    expect(arePolygonsEqual(a, b)).to.be.true
  })

  it('should not be equal (vertex coordinates)', () => {
    const a = [
      [32.8403, -117.249],
      [33.37490391451301, -116.97660570015627],
      [33.42492203887114, -117.11402936739367],
      [32.8403, -117.249]
    ]

    const b = [
      [32.8403, -117.249],
      [33.37490391451302, -116.97660570015627],
      [33.42492203887114, -117.11402936739367],
      [32.8403, -117.249]
    ]

    expect(arePolygonsEqual(a, b)).to.be.false
  })

  it('should not be equal (n vertices)', () => {
    const a = [
      [32.8403, -117.249],
      [33.37490391451302, -116.97660570015627],
      [33.42492203887114, -117.11402936739367],
      [32.8403, -117.249]
    ]

    const b = [
      [32.8403, -117.249],
      [33.37490391451302, -116.97660570015627],
      [33.37490391451302, -116.97660570015627],
      [33.42492203887114, -117.11402936739367],
      [32.8403, -117.249]
    ]

    expect(arePolygonsEqual(a, b)).to.be.false
  })
})
