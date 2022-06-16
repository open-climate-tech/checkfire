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

import calculateMidpoint from '../../../src/v2/modules/calculateMidpoint.mjs'

import calculateBearing from '../../../src/v2/modules/calculateBearing.mjs'

describe('calculateMidpoint()', () => {
  it('should return about [32.49444, -116.83848]', () => {
    const actual = calculateMidpoint([32.596845863937915, -116.94321341756395], [32.391968506759696, -116.75216219118724])
    expect(actual[0].toFixed(5)).to.equal('32.49444')
    expect(actual[1].toFixed(5)).to.equal('243.15242')
  })
})
