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
    path: '/bstack/api/envs',
    handler: async (request, reply) => {
      const envs = await model.bstack_task.getEnvs();

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
    path: '/bstack/api/modules',
    handler: async (request, reply) => {
      const envs = await model.bstack_task.getModules(request.query.env);

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

  server.route({
    method: 'GET',
    path: '/bstack/api/module/results/{last_builds}',
    handler: async (request, reply) => {
      var last_builds = request.query.lasters ? 1 : parseInt(request.params.last_builds);
      const builds = await model.bstack_task.getLastBuilds(last_builds, request.query);
      const tasks = await model.bstack_task.getTasksinBuilds(builds, request.query);
      var total_failures = 0;
      for (const build of builds) {
        for (const task of tasks[build]) {
          var taskResult = await model.axeresult.getByTaskId(task['_id'], request.query);
          task.results = taskResult;
          total_failures = total_failures + taskResult[0].count.total;
        }
      }

      const responseJson = request.query.lasters ? {total_failures} : {builds, tasks, total_failures};
      return reply.response(responseJson).code(200);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: Joi.object({
          module: Joi.string().required(),
          env: Joi.string().required(),
          lasters: Joi.boolean()
        }),
        payload: false
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/bstack/api/build/tasks',
    handler: async (request, reply) => {
      const tasks = await model.bstack_task.getTaskinBuild(request.query);
      request.query.full = true;
      for (const task of tasks) {
        var taskResult = await model.axeresult.getByTaskId(task['_id'], request.query);
        task.results = taskResult;
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
          module: Joi.string().required(),
          env: Joi.string().required(),
          build_no: Joi.string().required()
        }),
        payload: false
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/bstack/api/build/results',
    handler: async (request, reply) => {
      const tasks = await model.bstack_task.getTaskinBuild(request.query);
      request.query.full = true;
      var total_failures = 0;
      var result = {};
      for (const task of tasks) {
        var taskResult = await model.axeresult.getByTaskId(task['_id'], request.query);
        if (result[task.module]) {
          result[task.module] = result[task.module] + taskResult[0].count.total
        }else{
          result[task.module] = taskResult[0].count.total
        }
        total_failures = total_failures + taskResult[0].count.total;
      }

      return reply.response({total_failures, result}).code(200);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: Joi.object({
          module: Joi.string().required(),
          env: Joi.string().required(),
          build_no: Joi.string().required()
        }),
        payload: false
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/bstack/api/name/results',
    handler: async (request, reply) => {
      var last_builds = request.query.limit ? parseInt(request.query.limit) : 5;
      const builds = await model.bstack_task.getLastBuilds(last_builds, request.query);
      const tasks = await model.bstack_task.getTasksfromName(builds, request.query);
      for (const build of builds) {
        if(tasks[build] === undefined) {continue;}
        for (const task of tasks[build]) {
          var taskResult = await model.axeresult.getByTaskId(task['_id'], request.query);
          task.results = taskResult;
        }
      }

      return reply.response({builds, tasks}).code(200);
    },
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['cache-control', 'x-requested-with']
      },
      validate: {
        query: Joi.object({
          module: Joi.string().required(),
          env: Joi.string().required(),
          name: Joi.string().required(),
          limit: Joi.string()
        }),
        payload: false
      }
    }
  });

};