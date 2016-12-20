/**
 * @fileOverview Thin wrapper to produce kafka messages.
 */
const Promise = require('bluebird');
const KafkaRest = require('kafka-rest');

const kafkaConnect = require('./kafka-connect');

module.exports = class Producer {

  /**
   * The constructor.
   *
   * @param {Object} opts Required options:
   *   @param {string} topic The Kafka topic this consumer will work on.
   *   @param {Object} log A logger to use, must expose the `info` and `error`
   *     methods.
   *   @param {Object} schema The schema to use for this kafka topic.
   * @constructor
   */
  constructor (opts) {
    /** @type {string} The kafka topic this consumer will work on. */
    this.topic = opts.topic;

    // init local kafka-rest instance
    kafkaConnect.connect();
    /** @type {kafka-rest} The kafka-rest instance. */
    this.kafka = kafkaConnect.kafka;

    /** @type {kafka-rest.Schema} Kafka-rest schema instance. */
    this.schema = new KafkaRest.AvroSchema(opts.schema);

    /** @type {kafka-rest.topic} The kafka-rest topic instance. */
    this.kafkaTopic = this.kafka.topic(this.topic);

    /** @type {Object} A logger to use, must expose the `info` and `error` methods. */
    this.log = opts.log;
  }

  /**
   * Produce a kafka message.
   *
   * @param {Object} data Data to send.
   * @return {Promise} A Promise.
   */
  produce (data) {
    return new Promise(function(resolve, reject) {
      this.kafkaTopic.produce(this.schema, data, (err, res) => {
        if (err) {
          this.log.error('Error on produce:', err);
          reject(err);
          return;
        }
        resolve(res);
      });
    }.bind(this));
  }
};
