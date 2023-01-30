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
const {assert, expect, should} = chai;
const chaiHttp = require('chai-http');
const app = require('../../server-main');

chai.use(chaiHttp);
chai.should();

describe('WildfireCheck API test', function () {

    function checkRoute(url, method='get') {
        const chaiApp = chai.request(app);
        if (method === 'get') {
            return chaiApp.get(url);
        } else if (method === 'post') {
            return chaiApp.post(url);
        }
    }

    function verifyStatus(expectedStatus, err, res) {
        expect(err).to.be.null;
        expect(res.statusCode).to.equal(expectedStatus);
    }

    // beforeEach(function () {
    // });

    it('testGet should return success', function (done) {
        checkRoute('/api/testGet')
            .end((err, res) => {
                verifyStatus(200, err, res);
                expect(res.text).to.match(/Hello.*world/);
                done();
            });
    });

    it('checkAuth should fail without right token', function (done) {
        checkRoute('/api/checkAuth')
            .end((err, res) => {
                verifyStatus(401, err, res);
                done();
            });
    });

    it('google ouath should redirect', function (done) {
        checkRoute('/api/oauthUrl?path=foo')
            .redirects(0)
            .end((err, res) => {
                verifyStatus(302, err, res);
                done();
            });
    });

    it('FB ouath should redirect', function (done) {
        checkRoute('/api/oauthFbUrl?path=foo')
            .redirects(0)
            .end((err, res) => {
                done();
                verifyStatus(302, err, res);
            });
    });

    it('login password should fail with bad credentials', function (done) {
        checkRoute('/api/loginPassword', 'post')
            .send({username: 'username0', password: 'password0'})
            .end((err, res) => {
                verifyStatus(401, err, res);
                done();
            });
    });

    it('dev login password should redirect', function (done) {
        checkRoute('/api/oauthDevUrl?email=secret@example.com&host=localhost&path=foo&protocol=http')
            .redirects(0)
            .end((err, res) => {
                verifyStatus(302, err, res);
                done();
            });
    });

    it('logout should pass', function (done) {
        checkRoute('/api/logout')
            .end((err, res) => {
                verifyStatus(200, err, res);
                done();
            });
    });

    it('confirmedFires should pass', function (done) {
        checkRoute('/api/confirmedFires')
            .end((err, res) => {
                verifyStatus(200, err, res);
                expect(res.text).to.equal("[]");
                done();
            });
    });

    it('selectedFires should pass', function (done) {
        checkRoute('/api/selectedFires')
            .end((err, res) => {
                verifyStatus(200, err, res);
                expect(res.text).to.equal("[]");
                done();
            });
    });

    it('monitoredCameras should pass', function (done) {
        checkRoute('/api/monitoredCameras')
            .end((err, res) => {
                verifyStatus(200, err, res);
                console.log('XXXXX MMMMMMMM text', res.text);
                expect(res.text).to.match(/^\[.*\]$/);
                done();
            });
    });

    it('activeRxBurns should pass', function (done) {
        checkRoute('/api/activeRxBurns')
            .end((err, res) => {
                verifyStatus(200, err, res);
                console.log('XXXXX BBBBBBBBBBBB text', res.text);
                expect(res.text).to.match(/^\[.*\]$/);
                done();
            });
    });
});
