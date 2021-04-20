/* eslint id-length: 'off' */
/* eslint no-catch-shadow: 'off' */
/* eslint no-underscore-dangle: 'off' */
'use strict';

const {ObjectID} = require('mongodb');

// Result model
module.exports = function(app, callback) {
	app.db.collection('axeResults', (errors, collection) => {
		collection.ensureIndex({
			date: 1,
			task: 1
		}, {
			w: -1
		});

		const model = {
			collection: collection,

			// Create a result
			create(newResult) {
				if (!newResult.date) {
					newResult.date = Date.now();
				}
				if (newResult.task && !(newResult.task instanceof ObjectID)) {
					newResult.task = new ObjectID(newResult.task);
				}
				return collection.insertOne(newResult)
					.then(result => model.prepareForOutput(result.ops[0]))
					.catch(error => {
						console.error('model:axeresult:create failed', error.message);
					});
			},

			// Default filter options
			_defaultFilterOpts(opts) {
				const now = Date.now();
				const thirtyDaysAgo = now - (1000 * 60 * 60 * 24 * 30);
				return {
					from: (new Date(opts.from || thirtyDaysAgo)).getTime(),
					to: (new Date(opts.to || now)).getTime(),
					full: Boolean(opts.full),
					task: opts.task
				};
			},

			// Get results
			_getFiltered(opts) {
				opts = model._defaultFilterOpts(opts);
				const filter = {
					date: {
						$lt: opts.to,
						$gt: opts.from
					}
				};
				if (opts.task) {
					filter.task = new ObjectID(opts.task);
				}

				const prepare = opts.full ? model.prepareForFullOutput : model.prepareForOutput;

				return collection
					.find(filter)
					.sort({date: -1})
					.limit(opts.limit || 0)
					.toArray()
					.then(results => results.map(prepare))
					.catch(error => {
						console.error('model:result:_getFiltered failed');
						console.error(error.message);
					});
			},

			// Get results for all tasks
			getAll(opts) {
				delete opts.task;
				return model._getFiltered(opts);
			},

			// Get a result by ID
			getById(id, full) {
				const prepare = (full ? model.prepareForFullOutput : model.prepareForOutput);
				try {
					id = new ObjectID(id);
				} catch (error) {
					console.error('ObjectID generation failed.', error.message);
					return null;
				}
				return collection.findOne({_id: id})
					.then(result => {
						if (result) {
							result = prepare(result);
						}
						return result;
					})
					.catch(error => {
						console.error(`model:result:getById failed, with id: ${id}`, error.message);
						return null;
					});
			},

			// Get results for a single task
			getByTaskId(id, opts) {
				opts.task = id;
				return model._getFiltered(opts);
			},

			// Delete results for a single task
			deleteByTaskId(id) {
				try {
					id = new ObjectID(id);
				} catch (error) {
					console.error('ObjectID generation failed.', error.message);
					return null;
				}
				return collection.deleteMany({task: id})
					.catch(error => {
						console.error(`model:result:deleteByTaskId failed, with id: ${id}`);
						console.error(error.message);
					});
			},

			// Get a result by ID and task ID
			getByIdAndTaskId(id, task, opts) {
				const prepare = (opts.full ? model.prepareForFullOutput : model.prepareForOutput);

				try {
					id = new ObjectID(id);
					task = new ObjectID(task);
				} catch (error) {
					console.error('ObjectID generation failed.', error.message);
					return null;
				}

				return collection.findOne({
					_id: id,
					task: task
				})
					.then(result => {
						if (result) {
							result = prepare(result);
						}
						return result;
					})
					.catch(error => {
						console.error(`model:result:getByIdAndTaskId failed, with id: ${id}`);
						console.error(error.message);
					});
			},

			// Prepare a result for output
			prepareForOutput(result) {
				result = model.prepareForFullOutput(result);
				delete result.results;
				return result;
			},
			prepareForFullOutput(result) {
				return {
					id: result._id.toString(),
					task: result.task.toString(),
					date: new Date(result.date).toISOString(),
					count: result.count,
					ignore: result.ignore || [],
					results: result.results || []
				};
			},
			convertAxeResults(results) {
				return {
					count: {
						total: results.violations.length,
						serious: results.violations.filter(result => result.impact === 'serious').length,
						critical: results.violations.filter(result => result.impact === 'critical').length,
						moderate: results.violations.filter(result => result.impact === 'moderate').length,
						minor: results.violations.filter(result => result.impact === 'minor').length
					},
					results: results.violations
				};
			}

		};
		callback(errors, model);
	});
};
