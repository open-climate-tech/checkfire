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

// React frontend

import React, { Component } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import './App.css';
import VoteFires from './VoteFires';
import Prototypes from './Prototypes';
// prototype pages that need redirect
import Auth from './Auth';

const qs = require('qs');

// check document.cookie

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    const queryParams = qs.parse(window.location.search, {ignoreQueryPrefix: true});
    // console.log('qp', queryParams);
    if (queryParams.redirect && (queryParams.redirect[0] === '/')) {
      console.log('redirecting to ', queryParams.redirect);
      this.setState({redirect: queryParams.redirect});
    }
    // console.log('cookie', document.cookie);
  }

  render() {
    return (
      <div className="App">
        <header className="Disclaimer">
          <p>
            This site detects fires from real-time images between 8AM and 8PM California time.
          </p>
          <p>
            Please note that this site does not alert the fire authorities directly.
            If you discover a real fire that recently ignited,
            consider informing the fire department to take appropriate action.
          </p>
          <a href="/disclaimer.html">Disclaimer</a>
        </header>
        <Router>
          {
            (this.state.redirect) ? <Redirect to={this.state.redirect} /> : <span></span>
          }
          <Switch>
            <Route path="/auth" exact component={Auth} />
            <Route path="/prototypes" exact component={Prototypes} />
            <Route path="/" component={VoteFires} />
          </Switch>
          <Link to='/prototypes'>
            &nbsp;
          </Link>
        </Router>
      </div>
    );  
  }
}

export default App;
