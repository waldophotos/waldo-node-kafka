/**
 * @fileOverview Producer tests.
 */
const chai = require('chai');
const expect = chai.expect;

const tester = require('../lib/tester.lib');
const kafkaLib = require('../..');
const schemaFix = require('../fixtures/kafka-schema.fix');

const kafkaConnect = require('../../lib/kafka-connect');

describe('Producer tests', function() {
  beforeEach(function() {
    // reset the instance
    kafkaConnect.kafka = null;
  });

  describe('Erroneous behaviors', function() {
    it('Should cope when kafka is not reachable but later becomes', function() {
      kafkaLib.setKafkaUrl('http://localhost:6666');

      // Use random new name to force "Topic not found." error
      let topic = 'node-kafka-rest-' + Date.now();

      let producer = new kafkaLib.Producer({
        topic: topic,
        log: tester.log,
        schema: schemaFix,
        retryTimes: 5,
        retryInterval: 1000,
      });

      setTimeout(function() {
        // reset url so it connects
        kafkaLib.setKafkaUrl(null);

        // hack kafka connect
        kafkaConnect.kafka = null;
        kafkaConnect.connect();
        // hack producer instance
        producer.kafka = kafkaConnect.kafka;
        producer.kafkaTopic = producer.kafka.topic(producer.topic);
      }, 3000);

      return producer.produce({
        foo: 'bar',
      });
    });


    it('Should give up after 5 retries', function() {
      kafkaLib.setKafkaUrl('http://localhost:6666');

      // Use random new name to force "Topic not found." error
      let topic = 'node-kafka-rest-' + Date.now();

      let producer = new kafkaLib.Producer({
        topic: topic,
        log: tester.log,
        schema: schemaFix,
        retryTimes: 5,
        retryInterval: 300,
      });

      return producer.produce({
        foo: 'bar',
      })
        .then(function() {
          // should not be here
          let err = new Error('Resolved when it should not');
          err.ownError = true;
          throw err;
        })
        .catch(function(err) {
          if (err.ownError) {
            throw err;
          }

          expect(err.retries).to.equal(6);
          expect(err.source.message).to.equal('connect ECONNREFUSED 127.0.0.1:6666');
        });
    });
  });

});
