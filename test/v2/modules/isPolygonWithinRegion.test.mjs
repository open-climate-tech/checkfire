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

import isPolygonWithinRegion from '../../../src/v2/modules/isPolygonWithinRegion.mjs';

const region = { east: -116.6, north: 33, south: 32.7, west: -117.1 };

describe('isPolygonWithinRegion()', () => {
  it('should return true', () => {
    const polygon = [
      [32.61819878808114, -116.87451254544604],
      [32.705566256662166, -116.98240238397041],
      [32.665536974867564, -116.99776818559965],
      [32.60861088499767, -116.87568979191612],
      [32.61819878808114, -116.87451254544604],
    ];

    const actual = isPolygonWithinRegion(polygon, region);
    expect(actual).to.be.true;
  });

  it('should return false', () => {
    const polygon = [
      [33.61, -117.55],
      [33.06621532777801, -117.29642904295558],
      [33.14371242312582, -117.1724077653701],
      [33.61, -117.55],
    ];

    const actual = isPolygonWithinRegion(polygon, region);
    expect(actual).to.be.false;
  });
});
