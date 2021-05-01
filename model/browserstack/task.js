/* eslint id-length: 'off' */
/* eslint no-catch-shadow: 'off' */
/* eslint no-underscore-dangle: 'off' */
'use strict';

const {ObjectID} = require('mongodb');

// Result model
module.exports = function(app, callback) {
  app.db.collection('tasks', (errors, collection) => {

    const model = {
      collection: collection,

      // Create a result
      getEnvs() {
        return collection.distinct('env')
          .then(result => {
            return result
          })
          .catch(error => {
            console.error('model:browserstack:tasks:getEnvs failed', error.message);
          });
      },

      getModules(env) {
        return collection.distinct('module', {env: env})
          .then(result => {
            return result
          })
          .catch(error => {
            console.error('model:browserstack:tasks:getEnvs failed', error.message);
          });
      },

      getLastBuilds(limit, query){
        var builds = [];
        let matchQuery = { "env": query.env};
        if (query.module !== 'all')
          matchQuery['module'] = query.module

        return collection.aggregate([{$match: matchQuery}, {$group:{_id:'$build_no'}}, 
                             { $sort : { _id: -1 }}, {$limit: limit}])
          .toArray()
          .then((data) => {
            data.map( result => builds.push(result['_id']))
            return builds
          })
      },

      getTasksinBuilds(builds, prams){
        let matchQuery = { build_no: { $in: builds }, env: prams.env };
        if (prams.module !== 'all')
          matchQuery['module'] = prams.module
        var buildTasks = {}
        return collection.aggregate([{$match: matchQuery}])
          .toArray()
          .then(data => {
            let buildTasks = {};
            data.forEach(result => {
              if(buildTasks[result.build_no]){
                buildTasks[result.build_no].push(result)
              }else{
                buildTasks[result.build_no] = [result]
              }
            })
            return buildTasks
          })
      },

      getTaskinBuild(query){
        let andQuery = {build_no: parseInt(query.build_no), env: query.env}
        if (query.module !== 'all')
          andQuery['module'] = query.module
        return collection.find({ $and: [ andQuery ]})
          .toArray()
          .then(data => {
            return data
          })
      },

      getTasksfromName(builds, query){
        var buildTasks = {};
        let andQuery = {build_no: { $in: builds }, env: query.env, name: query.name}
        if (query.module !== 'all')
          andQuery['module'] = query.module
        return collection.find({ $and: [ andQuery ]})
          .toArray()
          .then(data => {
            let buildTasks = {};
            data.forEach(result => {
              if(buildTasks[result.build_no]){
                buildTasks[result.build_no].push(result)
              }else{
                buildTasks[result.build_no] = [result]
              }
            })
            return buildTasks
          })
      },

    };
    callback(errors, model);
  });
};
