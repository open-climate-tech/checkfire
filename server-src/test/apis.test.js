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

const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('../../server-main');

chai.use(chaiHttp);
chai.should();

describe('WildfireCheck API test', function () {

    // beforeEach(function () {
    // });

    it('endpoint should return success', function (done) {
        chai.request(app)
            .get('/api')
            .end((err, res) => {
                res.should.have.status(200);
                done();
            });
    });

});
