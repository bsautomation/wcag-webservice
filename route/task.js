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

const {green, grey, red} = require('kleur');
const Joi = require('@hapi/joi');
const {isValidAction} = require('pa11y');

// Routes relating to individual tasks
module.exports = function(app) {
  const model = app.model;
  const server = app.server;

  // Get a task
  server.route({
    method: 'GET',
    path: '/tasks/{id}',
    handler: async (request, reply) => {
      const task = await model.axeTask.getById(request.params.id);

      if (!task) {
        return reply.response('Not Found').code(404);
      }

      if (request.query.lastres) {
        const results = await model.axeresult.getByTaskId(task.id, {
          limit: 1,
          full: true
        });
        if (!results) {
          return reply.response().code(500);
        }
        task.last_result = null;
        if (results.length) {
          task.last_result = results[0];
        }
      }

      return reply.response(task).code(200);
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

  // Edit a task
  server.route({
    method: 'PATCH',
    path: '/tasks/{id}',
    handler: async (request, reply) => {
      const task = await model.axeTask.getById(request.params.id);
      const taskData = await model.axeTask.prepareForData(request.payload);

      if (!task) {
        console.log('task not Found')
        return reply.response('Not Found').code(404);
      }

      if (taskData.actions && taskData.actions.length) {
        for (let action of taskData.actions) {
          if (!isValidAction(action)) {
            return reply.response(`Invalid action: "${action}"`).code(400);
          }
        }
      }
      const updateCount = await model.axeTask.editById(task.id, taskData);
      if (updateCount < 1) {
        return reply.response().code(500);
      }
      const taskAgain = await model.axeTask.getById(task.id);
      return reply.response(taskAgain).code(200);
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

  // Delete a task
  server.route({
    method: 'DELETE',
    path: '/tasks/{id}',
    handler: async (request, reply) => {
      const task = await model.axeTask.deleteById(request.params.id);
      if (!task) {
        return reply.response('Not Found').code(404);
      }

      const removed = await model.axeresult.deleteByTaskId(request.params.id);
      if (!removed) {
        return reply.response().code(500);
      }
      return reply.response().code(204);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: {},
        payload: false
      }
    }
  });

  // Run a task
  server.route({
    method: 'POST',
    path: '/tasks/{id}/run',
    handler: async (request, reply) => {
      const task = await model.axeTask.getById(request.params.id);
      if (!task) {
        return reply.response('Not Found').code(404);
      }
      console.log('');
      console.log(grey('Starting to run one-off task @ %s'), new Date());
      console.log('Starting task %s', task.id);
      const executed = await model.axeTask.runAxeById(request.params.id);
      if (executed) {
        console.log(green('Finished task %s'), task.id);
      } else {
        console.log(
          red('Failed to finish task %s'),
          task.id
        );
        return reply.response(`Failed to finish task ${task.id}`).code(500);
      }
      console.log(
        grey('Finished running one-off task @ %s'),
        new Date()
      );
      return reply.response().code(202);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: {}
      }
    }
  });

  // Get results for a task
  server.route({
    method: 'GET',
    path: '/tasks/{id}/results',
    handler: async (request, reply) => {
      const task = await model.axeTask.getById(request.params.id);
      if (!task) {
        return reply.response('Not Found').code(404);
      }

      const results = await model.axeresult.getByTaskId(request.params.id, request.query);
      if (!results) {
        return reply.response('No results found for task').code(500);
      }
      return reply.response(results).code(200);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
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

  // Get a result for a task
  server.route({
    method: 'GET',
    path: '/tasks/{tid}/results/{rid}',
    handler: async (request, reply) => {
      const rid = request.params.rid;
      const tid = request.params.tid;
      const result = await model.result.getByIdAndTaskId(rid, tid, request.query);

      if (!result) {
        return reply.response('Not Found').code(404);
      }
      return reply.response(result).code(200);
    },
    options: {
      validate: {
        query: Joi.object({
          full: Joi.boolean()
        }),
        payload: false
      }
    }
  });

};
