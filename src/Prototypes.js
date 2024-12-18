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

// Prototype pages still under development

import React, { Component } from 'react';
import { Link } from 'react-router-dom';

class Prototypes extends Component {
  render() {
    return (
      <div>
        <h1>Prototypes</h1>
        <Link to="/confirmed">
          <li>Confirmed Fires</li>
        </Link>
      </div>
    );
  }
}

export default Prototypes;
