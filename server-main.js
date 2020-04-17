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

'use strict';
// UI backend server

const express = require('express');
const app = express();
const helmet = require('helmet');
const path = require('path');
const services = require('./server-src/services')

app.use(helmet())

// static webpage for /
app.use('/', express.static(path.join(__dirname, 'webroot')));
// react app for /wildfirecheck
app.use('/wildfirecheck', express.static(path.join(__dirname, 'build')));

// initialize dyanmic services
services.initServices(app, () => {
  // Start the server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`WildfireCheck back listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
});

module.exports = app;
