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

/* eslint camelcase: 'off' */
'use strict';

const _ = require('underscore');
const Joi = require('@hapi/joi');
const {isValidAction} = require('pa11y');

// Routes relating to all tasks
module.exports = function(app) {
  const model = app.model;
  const server = app.server;

   // Get Task by id
  server.route({
    method: 'GET',
    path: '/api/envs',
    handler: async (request, reply) => {
      const envs = await model.axeTask.getEnvs();

      return reply.response(envs).code(200);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: Joi.object({
          lastres: Joi.boolean()
        }),
        payload: false
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/api/modules',
    handler: async (request, reply) => {
      const envs = await model.axeTask.getModules(request.query.env);

      return reply.response(envs).code(200);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: Joi.object({
          env: Joi.string().required()
        }),
        payload: false
      }
    }
  });

  // Get all tasks
  server.route({
    method: 'GET',
    path: '/tasks',
    handler: async (request, reply) => {
      let tasks = await model.axeTask.getByModule(request.query);

      if (!tasks) {
        return reply.response().code(500);
      }

      let taskIds = []
      tasks.map(taskData => taskIds.push(taskData.id))

      if (request.query.lastres) {
        const results = await model.axeresult.getByTaskIds(taskIds, request.query);
        if (!results) {
          return reply.response().code(500);
        }
        const resultsByTask = _.groupBy(results, 'task');
        tasks = tasks.map(task => {
          if (resultsByTask[task.id] && resultsByTask[task.id].length) {
            task.last_result = resultsByTask[task.id][0];
          } else {
            task.last_result = null;
          }
          return task;
        });
      }

      return reply.response(tasks).code(200);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: Joi.object({
          lastres: Joi.boolean(),
          env: Joi.string().required(),
          module: Joi.string().required()
        }),
        payload: false
      }
    }
  });

  // Create a task
  server.route({
    method: 'POST',
    path: '/tasks',
    handler: async (request, reply) => {
      const taskData = await model.axeTask.prepareForData(request.payload);

      if (taskData.actions && taskData.actions.length) {
        for (let action of taskData.actions) {
          if (!isValidAction(action)) {
            console.log(`Invalid action: "${action}"`)
            return reply.response(`Invalid action: "${action}"`).code(400);
          }
        }
      }

      const existingTask = await model.axeTask.getByName(request.payload);
      if (existingTask !== null)
        return reply.response({id: existingTask.id, success: false, message: 'Task is already present with same name'}).code(200);

      const task = await model.axeTask.create(taskData);

      if (!task) {
        return reply.response().code(500);
      }

      return reply.response(task)
        .header('Location', `http://${request.info.host}/tasks/${task.id}`)
        .code(201);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: {},
        payload: Joi.object({
          module: Joi.string().required(),
          env: Joi.string().required(),
          name: Joi.string().required(),
          url: Joi.string().required(),
          standard: Joi.string().required().valid(
            'Section508',
            'WCAG2A',
            'WCAG2AA',
            'WCAG2AAA'
          ),
          timeout: Joi.string().allow(''),
          wait: Joi.string().allow(''),
          actions: Joi.string().allow(''),
          username: Joi.string().allow(''),
          password: Joi.string().allow(''),
          headers: Joi.string().allow(''),
          hideElements: Joi.string().allow('')
        })
      }
    }
  });

  // Get results for all tasks
  server.route({
    method: 'GET',
    path: '/tasks/results',
    handler: async (request, reply) => {
      const results = await model.result.getAll(request.query);
      return reply.response(results).code(200);
    },
    options: {
      validate: {
        query: Joi.object({
          from: Joi.string().isoDate(),
          to: Joi.string().isoDate(),
          full: Joi.boolean()
        }),
        payload: false
      }
    }
  });

};
