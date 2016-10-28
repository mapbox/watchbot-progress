/**
 * Create a progress DynamoDB table
 *
 * @param {string} name - the name for the DynamoDB table used to track progress.
 * @param {object} throughput - throughput configurations for DynamoDB table
 * @param {number} throughput.readCapacityUnits - approximate number of reads per
 * second from DynamoDB table
 * @param {number} throughput.writeCapacityUnits - approximate number of writes
 * per second to DynamoDB table
 * @returns {object} a progress client
 * @example
 * var table = require('watchbot-progress').table;
 */
module.exports = function table(name, throughput) {
  if (!throughput.readCapacityUnits || !throughput.writeCapacityUnits) throw new Error('tableThroughput.readCapacityUnits and tableThroughput.writeCapacityUnits are required params');
  return {
    Type: 'AWS::DynamoDB::Table',
    Properties: {
      TableName: name,
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      ProvisionedThroughput: {
        ReadCapacityUnits: throughput.readCapacityUnits,
        WriteCapacityUnits: throughput.writeCapacityUnits
      }
    }
  };
};
