/* global afterEach, before */
/* jshint maxlen: 200 */
'use strict';

var app = require('../../app');
var config = require('../../config/test.json');
var createNavigator = require('./helper/navigate');
var loadFixtures = require('../../data/fixture/load');
var request = require('request');

// Run before all tests
before(function (done) {
	var self = this;

	self.baseUrl = 'http://localhost:' + config.port + '/';
	self.app = null;
	self.last = {};
	self.navigate = createNavigator(self.baseUrl, self.last);

	assertTestAppIsRunning(self.baseUrl, function () {
		config.dbOnly = true;
		app(config, function (err, app) {
			self.app = app;
			loadFixtures('test', config, done);
		});
	});

});

// Run after each test
afterEach(function (done) {
	loadFixtures('test', config, done);
});

// Check that the test application is running, and exit if not
function assertTestAppIsRunning (baseUrl, done) {
	request(baseUrl, function (err) {
		if (err) {
			console.error('Error: Test app not started; run with `grunt start-test`');
			process.exit();
		}
		done();
	});
}
