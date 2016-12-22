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

  describe('Nominal behaviors', function() {
    beforeEach(function() {
      // Use random new name to force "Topic not found." error
      let topic = 'node-kafka-rest-' + Date.now();

      this.consumer = new kafkaLib.Consumer({
        topic: topic,
        log: tester.log,
        retryInterval: 1000,
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

    it('should consume a message when topic exists', function(done) {
      this.producer.produce({
        foo: 'bar',
      })
        .bind(this)
        .then(function() {
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
        });
    });
    it('should consume a message before topic created', function(done) {
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

      // wait a bit, then produce
      setTimeout(() => {
        this.producer.produce({
          foo: 'bar',
        });
      }, 500);
    });
  });

  describe('Erroneous behaviors', function() {
    it('Should cope when kafka is not there', function() {
      kafkaLib.setKafkaUrl('http://localhost:6666');

      // Use random new name to force "Topic not found." error
      let topic = 'node-kafka-rest-' + Date.now();

      let consumer = new kafkaLib.Consumer({
        topic: topic,
        log: tester.log,
        retryInterval: 1000,
      });

      setTimeout(function() {

        expect(consumer.connectRetries).to.be.at.least(2);

        // reset url so it connects
        kafkaLib.setKafkaUrl(null);

        // hack kafka connect
        kafkaConnect.kafka = null;
        kafkaConnect.connect();
        // hack consumer instance
        consumer.kafka = kafkaConnect.kafka;
      }, 3000);

      return consumer.connect({
        consumerGroup: 'node-kafka-test',
        onMessage: () => {
        },
        onError: (err) => {
          console.error('TEST Consumer onError:', err);
        },
      });
    });


    it('Should dispose when still not connected', function(done) {
      kafkaLib.setKafkaUrl('http://localhost:6666');

      // Use random new name to force "Topic not found." error
      let topic = 'node-kafka-rest-' + Date.now();

      let consumer = new kafkaLib.Consumer({
        topic: topic,
        log: tester.log,
        retryInterval: 1000,
      });

      setTimeout(() => {
        consumer.dispose()
          .then(done)
          .catch(done);
      }, 500);
    });
  });
});
