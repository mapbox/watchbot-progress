[![Build Status](https://travis-ci.com/mapbox/watchbot-progress.svg?token=Z8JyQH8sBSdZv3SwHK2w&branch=master)](https://travis-ci.org/mapbox/watchbot-progress)

# watchbot-progress

`watchbot-progress` a series of tracking tools available on reduce-enabled Watchbot stacks to track the progress of distributed map-reduce operations. See the included `examples.md` for some basic worker recipes.

### Installation

```
npm install watchbot-progress
```

### Using the CLI command

A CLI command is available to report progress to Watchbot, and is accessible by default on reduce-enabled Watchbot stacks.

```
$ watchbot-progress --help

  Tracks the progress of a distributed map-reduce operation

  USAGE: watchbot-progress <command> <job-id> [options]

  Environment variable $ProgressTable must be set as the ARN for the DynamoDB
  table that is used to track progress.

  COMMANDS:
    - status: check the status of a job
    - set-total: set the total number of parts in a job
    - set-metadata: set arbitrary metadata on the job record
    - complete-part: complete a single part
    - fail-job: mark a job as a failure

  OPTIONS:
    -t, --total     (for set-total) the total number of parts in a job
    -p, --part      (for complete-part) the part number to mark as complete
    -m, --metadata  (for set-metadata) the JSON metadata object to store
    -r, --reason    (for fail-job) a description of why the job failed
```

Note that by default, workers in reduce-enabled Watchbot stacks will have the `$ProgressTable`
environment variable set automatically.

### Creating a progress table

A JavaScript module is available to create a DynamoDB table. You will need to provide any CloudFormation permissions.

```js
var table = require('watchbot-progress').table;
```

This function requires 2 parameters:

- **name**: DynamoDB table name
- **throughout**: Object that contains user specification for progress table read and write capacity units:
  - **throughput.readCapacityUnits**: Approximate number of reads per second from progress table
  - **throughput.writeCapacityUnits**: Approximate number of writes per second to progress table

### Reporting progress in JavaScript

A JavaScript module is also available as a mechanism for progress reporting.

```js
var progress = require('watchbot-progress').progress;
```

- **progress.setTotal(jobId, total, [callback])**: Set the total number of parts for a particular map-reduce operation.
- **progress.completePart(jobId, part, [callback])**: Mark a single part as complete. The response will be a boolean value indicating whether or not the operation is completed.
- **progress.setMetadata(jobId, metadata, [callback])**: Associate arbitrary metadata with a particular map-reduce operation.
- **progress.status(jobId, [callback])**: Read the status of a particular map-reduce operation.
- **progress.failJob(jobId, reason, [callback])**: Mark an operation as a failure, providing a description of what went wrong.
