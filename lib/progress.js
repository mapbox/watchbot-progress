module.exports = client;
module.exports.Dyno = require('dyno'); // mockable

/**
 * Create a progress-tracking client
 *
 * @param {string} [table] - the ARN for the DynamoDB table used to track progress.
 * If not provided, it will look for `$ProgessTable` environment variable, and
 * fail if neither is provided.
 * @returns {object} a progress client
 * @example
 * var progress = require('watchbot-progress').progress;
 */
function client(table) {
  table = table || process.env.ProgressTable;
  if (!table) throw new Error('ProgressTable environment variable is not set');

  var dyno = module.exports.Dyno({
    table: table.split(':')[5].split('/')[1],
    region: table.split(':')[3],
    endpoint: process.env.DynamoDbEndpoint
  });

  /**
   * Watchbot's progress client
   *
   * @name client
   */
  return {
    /**
     * Sets the total number of parts for a map-reduce job
     *
     * @memberof client
     * @param {string} jobId - the identifier for a map-reduce job
     * @param {number} total - the total number of parts
     * @param {function} [callback] - a function that will be called when the total
     * number of parts for this job has been recorded
     * @returns {promise}
     */
    setTotal: setTotal.bind(null, dyno),

    /**
     * Mark one part of a map-reduce job as complete
     *
     * @memberof client
     * @param {string} jobId - the identifier for a map-reduce job
     * @param {number} part - the part that has completed (1-based, not 0-based)
     * @param {function} [callback] - a function that will be called indicating whether
     * or not the entire map-reduce job is complete
     * @returns {promise}
     */
    completePart: completePart.bind(null, dyno),

    /**
     * Fetch the status of a pending job
     *
     * @memberof client
     * @param {string} jobId - the identifier for a map-reduce job
     * @param {number} [part] - the part number to check on
     * @param {function} [callback] - a function that will be called indicating the
     * current job status
     * @returns {promise}
     * @example
     * // a pending job that is 25% complete
     * { "progress": 0.25 }
     * @example
     * // a completed job
     * { "progress": 1 }
     * @example
     * // a job that failed after completing 60% of the work
     * { "progress": 0.60, "failed": "the reason for the failure" }
     * @example
     * // a job 75% complete which includes metadata
     * { "progress": 0.75, "metadata": { "name": "favorite-map-reduce" } }
     * @example
     * // a job 75% complete indicating that the requested part has already been completed
     * { "progress": 0.75, "partComplete": true }
     * @example
     * // a job 100% complete indicating that the reduce step has been taken
     * { "progress": 0.75, "reduceSent": true }
     */
    status: status.bind(null, dyno),

    /**
     * Flag a job record to indicate that a reduce step has been taken.
     *
     * @param {string} jobId - the identifier for a map-reduce job
     * @param {function} [callback] - a function that will be called when the flag has been set
     * @returns {promise}
     */
    reduceSent: reduceSent.bind(null, dyno),

    /**
     * Fail a job
     *
     * @memberof client
     * @param {string} jobId - the identifier for a map-reduce job
     * @param {string} reason - a description of why the job failed
     * @param {function} [callback] - a function that will be called when the reason
     * for the failure has been recorded
     * @returns {promise}
     */
    failJob: failJob.bind(null, dyno),

    /**
     * Associate arbitrary metadata with the progress record which can be retrieved
     * with a status request.
     *
     * @param {string} jobId - the identifier for a map-reduce job
     * @param {object} metadata - arbitrary metadata to store with the progress record.
     * @param {function} [callback] - a function that will be called when the metadata
     * has been recorded
     * @returns {promise}
     */
    setMetadata: setMetadata.bind(null, dyno)
  };
}

function setTotal(dyno, jobId, total, callback) {
  callback = callback || function() {};

  var parts = [];
  for (var i = 1; i <= total; i++) parts.push(i);

  var params = {
    Key: { id: jobId },
    ExpressionAttributeNames: { '#p': 'parts', '#t': 'total' },
    ExpressionAttributeValues: { ':p': module.exports.Dyno.createSet(parts), ':t': total },
    UpdateExpression: 'set #p = :p, #t = :t'
  };

  return new Promise((resolve, reject) => {
    dyno.updateItem(params, function(err) {
      if (err) {
        callback(err);
        reject(err);
      } else {
        callback();
        resolve();
      }
    });
  });
}

function completePart(dyno, jobId, part, callback) {
  callback = callback || function() {};

  var params = {
    Key: { id: jobId },
    ExpressionAttributeNames: { '#p': 'parts' },
    ExpressionAttributeValues: { ':p': module.exports.Dyno.createSet([part]) },
    UpdateExpression: 'delete #p :p',
    ReturnValues: 'ALL_NEW'
  };

  return new Promise((resolve, reject) => {
    dyno.updateItem(params, function(err, data) {
      if (err) {
        callback(err);
        reject(err);
      } else {
        console.log('updateItem(): data for nonexistent jobid: ' + JSON.stringify(data));
        var record = data.Attributes;
        console.log('data.Attributes for nonexistent jobId: ' + JSON.stringify(record));
        var complete = !record.parts || !record.parts.values.length;
        callback(null, complete);
        resolve(complete);
      }
    });
  });
}

function status(dyno, jobId, part, callback) {
  if (typeof part === 'function') {
    callback = part;
    part = undefined;
  }

  callback = callback || function() {};

  return new Promise((resolve, reject) => {
    console.log('About to getItem');
    dyno.getItem({ Key: { id: jobId } }, function(err, data) {
      if (err) {
        callback(err);
        reject(err);
      } else {
        console.log('succesfully returned from getting item');
        var item = data.Item;
        console.log('item?');
        console.log(item);
        if (!item) {
          console.log('no item, returning 0');
          return callback(null, { progress: 0 });
        }

        var remaining = item.parts ? item.parts.values.length : 0;
        var percent = (item.total - remaining) / item.total;
        percent = Number(percent.toFixed(2));

        var response = { progress: percent };
        console.log('RESPONSE');
        console.log(response);
        if (item.error) response.failed = item.error;
        if (item.metadata) response.metadata = item.metadata;
        if (part) response.partComplete = item.parts ? item.parts.values.indexOf(part) === -1 : true;
        if (item.hasOwnProperty('reduceSent')) response.reduceSent = item.reduceSent;
        callback(null, response);
        resolve(response);
      }
    });
  });
}

function reduceSent(dyno, jobId, callback) {
  callback = callback || function() {};

  var params = {
    Key: { id: jobId },
    ExpressionAttributeNames: { '#r': 'reduceSent' },
    ExpressionAttributeValues: { ':r': true },
    UpdateExpression: 'set #r = :r'
  };

  return new Promise((resolve, reject) => {
    dyno.updateItem(params, function(err) {
      if (err) {
        callback(err);
        reject(err);
      } else {
        callback();
        resolve();
      }
    });
  });
}

function failJob(dyno, jobId, reason, callback) {
  callback = callback || function() {};

  var params = {
    Key: { id: jobId },
    ExpressionAttributeNames: { '#e': 'error' },
    ExpressionAttributeValues: { ':e': reason },
    UpdateExpression: 'set #e = :e'
  };

  return new Promise((resolve, reject) => {
    dyno.updateItem(params, function(err) {
      if (err) {
        callback(err);
        reject(err);
      } else {
        callback();
        resolve();
      }
    });
  });
}

function setMetadata(dyno, jobId, metadata, callback) {
  callback = callback || function() {};

  var params = {
    Key: { id: jobId },
    ExpressionAttributeNames: { '#m': 'metadata' },
    ExpressionAttributeValues: { ':m': metadata },
    UpdateExpression: 'set #m = :m'
  };

  return new Promise((resolve, reject) => {
    dyno.updateItem(params, function(err) {
      if (err) {
        callback(err);
        reject(err);
      } else {
        callback();
        resolve();
      }
    });
  });
}
