/* eslint camelcase: 'off' */
'use strict';

const {green, grey, red} = require('kleur');
const Joi = require('@hapi/joi');
const Hapi = require('@hapi/hapi');
const json2csv = require('json2csv');

module.exports = function(app) {
  const model = app.model;
  const server = app.server;

  function convertToCSV(data){
    var rows = ['"name","url","code","impact","message","selector","source"'];
    data.forEach(task => {
      let results = task.results[0].results[0]
      Object.keys(results).forEach(impact => {
        results[impact].forEach(failure => {
          let target = []; let source = [];
          failure.nodes.filter(node => target.push(node.html.replace(/(\r\n|\n|\r)/gm," ")));
          failure.nodes.filter(node => source.push(node.target.replace(/(\r\n|\n|\r)/gm," ")));
          rows.push([
            task.name.replace(/,/gm, ';'),
            task.url,
            failure.id,
            failure.impact,
            failure.help + ' (' + failure.helpUrl + ')',
            target.join("; "),
            source.join("; "),
          ].join(','));
        })
      })
    })
    return rows;
  }

  server.route({
    method: 'GET',
    path: '/bstack/api/build.csv',
    handler: async (request, reply) => {
      let name = request.query.module + '-' + request.query.env + '-' + request.query.build_no + '.csv';
      const tasks = await model.bstack_task.getTaskinBuild(request.query);
      request.query.full = true;
      for (const task of tasks) {
        var taskResult = await model.axeresult.getByTaskId(task['_id'], request.query);
        task.results = taskResult;
      }
      var csv = convertToCSV(tasks); 
      return reply.response(csv.join('\n')).header('Content-Type', 'application/octet-stream')
                .header('content-disposition', 'attachment; filename=' + name + ';').code(200);
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

};