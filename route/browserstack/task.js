/* eslint camelcase: 'off' */
'use strict';

const {green, grey, red} = require('kleur');
const Joi = require('@hapi/joi');
const {ObjectID} = require('mongodb');
const {isValidAction} = require('pa11y');

module.exports = function(app) {
  const model = app.model;
  const server = app.server;

  // Get Task by id
  server.route({
    method: 'GET',
    path: '/bstack/api/tasks/{id}',
    handler: async (request, reply) => {
      const task = await model.task.getById(request.params.id);

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
      validate: {
        query: Joi.object({
          lastres: Joi.boolean()
        }),
        payload: false
      }
    }
  });

  // Create a task
  server.route({
    method: 'POST',
    path: '/bstack/api/add_task',
    handler: async (request, reply) => {
      if (request.payload.actions && request.payload.actions.length) {
        for (let action of request.payload.actions) {
          if (!isValidAction(action)) {
            console.log(`Invalid action: "${action}"`)
            return reply.response(`Invalid action: "${action}"`).code(400);
          }
        }
      }

      var existingTask = await model.task.getByName(request.payload);
      if (existingTask !== null)
        return reply.response('Task is present with same name, task id - ' + existingTask.id).code(400);

      if (!request.payload.result){
        console.log('Please provide result')
        return reply.response('Please provide result').code(400);
      }

      var result = Object.assign(request.payload.result);
      delete request.payload.result
      const task = await model.task.create(request.payload);

      if (!task) {
        return reply.response().code(500);
      }

      const results = model.axeresult.convertAxeResults(result);
      results.task = new ObjectID(task.id);
      const axeResults = model.axeresult.create(results);

      return reply.response({task, axeResults})
        .header('Location', `http://${request.info.host}/tasks/${task.id}`)
        .code(201);
    },
    options: {
      validate: {
        query: {},
        payload: Joi.object({
          maxBytes: 1000 * 1000 * 5, // 5 Mb
          module: Joi.string().required(),
          build_no: Joi.number().integer(),
          env: Joi.string().required(),
          name: Joi.string().required(),
          functionality: Joi.string().allow(''),
          timeout: Joi.number().integer(),
          wait: Joi.number().integer(),
          url: Joi.string().required(),
          username: Joi.string().allow(''),
          password: Joi.string().allow(''),
          standard: Joi.string().required().valid(
            'Section508',
            'WCAG2A',
            'WCAG2AA',
            'WCAG2AAA'
          ),
          ignore: Joi.array(),
          actions: Joi.array().items(Joi.string()),
          hideElements: Joi.string().allow(''),
          headers: [
            Joi.string().allow(''),
            Joi.object().pattern(/.*/, Joi.string().allow(''))
          ],
          result: Joi.array()
        })
      }
    }
  });

  // Edit a task
  server.route({
    method: 'PATCH',
    path: '/bstack/api/edit_task',
    handler: async (request, reply) => {
      const task = await model.task.getById(request.params.id);

      if (!task) {
        return reply.response('Not Found').code(404);
      }

      if (request.payload.actions && request.payload.actions.length) {
        for (let action of request.payload.actions) {
          if (!isValidAction(action)) {
            return reply.response(`Invalid action: "${action}"`).code(400);
          }
        }
      }

      if (request.payload.result){
        var result = Object.assign({}, request.payload.result);
        delete request.payload.result
      }

      const updateCount = await model.task.editById(task.id, request.payload);
      if (updateCount < 1) {
        return reply.response('Task is not updated').code(500);
      }
      const taskAgain = await model.task.getById(task.id);

      if (!task) {
        return reply.response().code(500);
      }

      if (request.payload.result){
        const results = model.axeresult.convertAxeResults(result);
        results.task = new ObjectID(taskAgain.id);
        const axeResults = model.axeresult.create(results);
      }

      return reply.response(taskAgain)
        .header('Location', `http://${request.info.host}/tasks/${task.id}`)
        .code(201);
    },
    options: {
      validate: {
        query: {},
        payload: Joi.object({
          module: Joi.string().required(),
          build_no: Joi.number().integer(),
          env: Joi.string().required(),
          name: Joi.string().required(),
          functionality: Joi.string().allow(''),
          timeout: Joi.number().integer(),
          wait: Joi.number().integer(),
          url: Joi.string().required(),
          username: Joi.string().allow(''),
          password: Joi.string().allow(''),
          standard: Joi.string().required().valid(
            'Section508',
            'WCAG2A',
            'WCAG2AA',
            'WCAG2AAA'
          ),
          ignore: Joi.array(),
          actions: Joi.array().items(Joi.string()),
          hideElements: Joi.string().allow(''),
          headers: [
            Joi.string().allow(''),
            Joi.object().pattern(/.*/, Joi.string().allow(''))
          ],
          result: Joi.object()
        })
      }
    }
  });

  // Get results for a task
  server.route({
    method: 'GET',
    path: '/bstack/api/tasks/{id}/results',
    handler: async (request, reply) => {
      const task = await model.task.getById(request.params.id);
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