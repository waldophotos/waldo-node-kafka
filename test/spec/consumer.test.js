/**
 * @fileOverview Consumer tests.
 */
const chai = require('chai');
const expect = chai.expect;

const tester = require('../lib/tester.lib');
const kafkaLib = require('../..');
const schemaFix = require('../fixtures/kafka-schema.fix');

const kafkaConnect = require('../../lib/kafka-connect');

describe('Consumer tests', function() {
  beforeEach(function() {
    // reset the instance
    kafkaConnect.kafka = null;
  });

  describe('Nominal behavior', function() {
    beforeEach(function() {
      // Use random new name to force "Topic not found." error
      let topic = 'node-kafka-rest-' + Date.now();

      this.consumer = new kafkaLib.Consumer({
        topic: topic,
        log: tester.log,
      });

      this.producer = new kafkaLib.Producer({
        topic: topic,
        log: tester.log,
        schema: schemaFix,
      });
    });
    afterEach(function() {
      return this.consumer.dispose();
    });

    it.only('should consume a message', function(done) {
      this.consumer.connect({
        consumerGroup: 'node-kafka-test',
        onMessage: (message) => {
          expect(message.value).to.have.keys(['foo']);
          expect(message.value.foo).to.equal('bar');

          done();
        },
        onError: (err) => {
          console.error('TEST Consumer onError:', err);
          done(err);
        },
      });

      this.producer.produce({
        foo: 'bar',
      });
    });
  });
});
