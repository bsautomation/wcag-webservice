/* eslint id-length: 'off' */
/* eslint no-catch-shadow: 'off' */
/* eslint no-underscore-dangle: 'off' */
'use strict';

const {ObjectID} = require('mongodb');

// Result model
module.exports = function(app, callback) {
  app.db.collection('axeResults', (errors, collection) => {

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
      }

    };
    callback(errors, model);
  });
};
