var table = require('../lib/table');
var tape = require('tape');

tape('[table] success, no condition', function(assert) {
  var name = 'test-name';
  var throughput = {
    readCapacityUnits: 10,
    writeCapacityUnits: 10
  };

  assert.deepEqual(table(name, throughput), {
    Type: 'AWS::DynamoDB::Table',
    Properties: {
      TableName: 'test-name',
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH'
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
      }
    }
  });
  assert.end();
});

tape('[table] success, condition', function(assert) {
  var name = 'test-name';
  var throughput = {
    readCapacityUnits: 10,
    writeCapacityUnits: 10
  };
  var condition = 'UseReduce';

  assert.deepEqual(table(name, throughput, condition), {
    Type: 'AWS::DynamoDB::Table',
    Condition: condition,
    Properties: {
      TableName: 'test-name',
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH'
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
      }
    }
  });
  assert.end();
});
