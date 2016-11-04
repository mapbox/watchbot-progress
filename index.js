/**
 * Watchbot services to track the progress of distributed map-reduce operations
 *
 * @name watchbot-progress
 */
module.exports = {
  progress: require('./lib/progress'),
  table: require('./lib/table')
};
