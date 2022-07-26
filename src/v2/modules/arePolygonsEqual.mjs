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

export default function arePolygonsEqual(a, b) {
  if (a == null || b == null || a.length !== b.length) {
    return false
  }

  for (let i = 0, n = a.length; i < n; ++i) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) {
      return false
    }
  }

  return true
}
