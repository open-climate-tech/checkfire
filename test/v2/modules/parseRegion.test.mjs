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

import parseRegion from '../../../src/v2/modules/parseRegion.mjs'

describe('parseRegion()', () => {
  it("should parse '40,50,-85,-95'", () => {
    const expected = {east: -85, north: 50, south: 40, west: -95}
    const actual = parseRegion('40,50,-95,-85')

    expect(actual).to.deep.equal(expected)
  })

  it("should throw northern boundary in southern hemisphere", () => {
    const expected = /northern.*?< 0°/
    const actual = () => parseRegion('45,-45,-85,-95')

    expect(actual).to.throw(expected)
  })

  it("should throw invalid northern boundary", () => {
    const expected = /northern.*?> 90°/
    const actual = () => parseRegion('45,91,-85,-95')

    expect(actual).to.throw(expected)
  })

  it("should throw southern boundary in southern hemisphere", () => {
    const expected = /southern.*?< 0°/
    const actual = () => parseRegion('-45,45,-85,-95')

    expect(actual).to.throw(expected)
  })

  it("should throw invalid southern boundary", () => {
    const expected = /southern.*?> 90°/
    const actual = () => parseRegion('91,45,-85,-95')

    expect(actual).to.throw(expected)
  })

  it("should throw too close latitudinally", () => {
    const expected = /northern and southern latitudes are too close/
    const actual = () => parseRegion('44.9,45.1,-95,-85')

    expect(actual).to.throw(expected)
  })

  it("should throw eastern boundary in eastern hemisphere", () => {
    const expected = /eastern.*?> 0°/
    const actual = () => parseRegion('40,50,-85,95')

    expect(actual).to.throw(expected)
  })

  it("should throw invalid eastern boundary", () => {
    const expected = /eastern.*?< -180°/
    const actual = () => parseRegion('40,50,-85,-181')

    expect(actual).to.throw(expected)
  })

  it("should throw western boundary in eastern hemisphere", () => {
    const expected = /western.*?> 0°/
    const actual = () => parseRegion('40,50,85,-95')

    expect(actual).to.throw(expected)
  })

  it("should throw invalid western boundary", () => {
    const expected = /western.*?< -180°/
    const actual = () => parseRegion('40,50,-181,-95')

    expect(actual).to.throw(expected)
  })

  it("should throw too close longitudinally", () => {
    const expected = /eastern and western longitudes are too close/
    const actual = () => parseRegion('40,50,-89.9,-90.1')

    expect(actual).to.throw(expected)
  })
})
