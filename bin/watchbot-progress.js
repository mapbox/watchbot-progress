#!/usr/bin/env node

/* eslint-disable no-console */

var meow = require('meow');
var client = require('../lib/progress');

var help = `
  USAGE: watchbot-progress <command> <job-id> [options]

  Environment variable $ProgressTable must be set as the ARN for the DynamoDB
  table that is used to track progress.

  COMMANDS:
    - status: check the status of a job
    - set-total: set the total number of parts in a job
    - set-metadata: set arbitrary metadata on the job record
    - complete-part: complete a single part
    - fail-job: mark a job as a failure
    - reduce-sent: mark a job as having its reduce step taken

  OPTIONS:
    -t, --total     (for set-total) the total number of parts in a job
    -p, --part      (for complete-part or status) the part number to mark as complete or check for completeness
    -m, --metadata  (for set-metadata) the JSON metadata object to store
    -r, --reason    (for fail-job) a description of why the job failed
`;

var options = {
  help: help,
  description: 'Tracks the progress of a distributed map-reduce operation'
};

var minimistOpts = {
  alias: { t: 'total', p: 'part', m: 'metadata', r: 'reason' },
  number: ['total', 'part'],
  string: ['reason']
};

var cli = meow(options, minimistOpts);

var command = cli.input[0];
var jobId = cli.input[1];

if (!jobId) {
  console.error('No job id provided');
  cli.showHelp(1);
}

var progress;
try { progress = client(); }
catch (err) { cli.showHelp(1); }

function complete(err, data) {
  if (err) {
    console.error(err);
    cli.showHelp(1);
  }

  if (data !== undefined) console.log(JSON.stringify(data));
}

if (command === 'status') return progress.status(jobId, cli.flags.part, complete);
if (command === 'set-total') return progress.setTotal(jobId, cli.flags.total, complete);
if (command === 'set-metadata') {
  var metadata;

  try { metadata = JSON.parse(cli.flags.metadata); }
  catch (err) {
    console.error('Could not parse provided metadata');
    cli.showHelp(1);
  }

  return progress.setMetadata(jobId, metadata, complete);
}
if (command === 'complete-part') return progress.completePart(jobId, cli.flags.part, complete);
if (command === 'fail-job') return progress.failJob(jobId, cli.flags.reason, complete);
if (command === 'reduce-sent') return progress.reduceSent(jobId, complete);

cli.showHelp(1);
