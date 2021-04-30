// This file is part of Pa11y Webservice.
//
// Pa11y Webservice is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Pa11y Webservice is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Pa11y Webservice.  If not, see <http://www.gnu.org/licenses/>.
'use strict';

const async = require('async');
const Hapi = require('@hapi/hapi');
const {MongoClient} = require('mongodb');

module.exports = initApp;

// Initialise the application
function initApp(config, callback) {

  const app = module.exports = {
    server: new Hapi.Server({
      host: config.host,
      port: config.port
    }),
    database: null,
    model: {},
    config: config
  };

  async.series([
    next => {
      /* eslint camelcase: 'off' */
      const client = new MongoClient(config.database_url);
      client.connect(function(err) {
        if (err) {
          console.log('Error connecting to MongoDB:');
          console.log(JSON.stringify(err));
          return next(err);
        }
        console.log('Connected successfully to server');

        const db = client.db(config.database);
        app.db = db;
        next(err);
      });
    },

    next => {
      require('./model/result')(app, (error, model) => {
        app.model.result = model;
        next(error);
      });
    },

    next => {
      require('./model/axeResult')(app, (error, model) => {
        app.model.axeresult = model;
        next(error);
      });
    },

    next => {
      require('./model/browserstack/task')(app, (error, model) => {
        app.model.bstack_task = model;
        next(error);
      });
    },

    next => {
      require('./model/browserstack/task')(app, (error, model) => {
        app.model.bstack_result = model;
        next(error);
      });
    },

    next => {
      require('./model/task')(app, (error, model) => {
        app.model.task = model;
        next(error);
      });
    },

    next => {
      require('./model/browserstack/axeTasks')(app, (error, model) => {
        app.model.axeTask = model;
        next(error);
      });
    },

    next => {
      if (!config.dbOnly && process.env.NODE_ENV !== 'test') {
        require('./task/pa11y')(config, app);
      }
      next();
    },

    next => {
      if (config.dbOnly) {
        return next();
      }

      require('./route/index')(app);
      require('./route/tasks')(app);
      require('./route/task')(app);
      require('./route/browserstack/task')(app);
      require('./route/browserstack/api')(app);
      require('./route/browserstack/download')(app);

      app.server.start()
        .then(
          () => next(),
          error => next(error)
        );
      app.server.events.on('response', function (request) {
        console.log(request.info.remoteAddress + ': ' + request.method.toUpperCase() + ' ' + request.path + ' --> ' + request.response.statusCode);
      });
      console.log(`Server running at: ${app.server.info.uri}`);
    }

  ], error => callback(error, app));

}
