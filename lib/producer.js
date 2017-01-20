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
   *   @param {Object=} keySchema Optionally define a partioning key schema.
   *   @param {number=} retryInterval How long to wait before retrying a connection.
   *   @param {number=} retryTimes How many times to retry before giving up.
   * @constructor
   */
  constructor (opts) {
    /** @type {string} The kafka topic this consumer will work on. */
    this.topic = opts.topic;
    /** @type {number} how log to wait before retrying a connection in ms */
    this.retryInterval = opts.retryInterval || 5000;
    /** @type {number} How many times to retry before giving up. */
    this.retryTimes = opts.retryTimes || 3;

    // init local kafka-rest instance
    kafkaConnect.connect();
    /** @type {kafka-rest} The kafka-rest instance. */
    this.kafka = kafkaConnect.kafka;

    /** @type {kafka-rest.Schema} Kafka-rest schema instance. */
    this.schema = new KafkaRest.AvroSchema(opts.schema);

    /** @type {?kafka-rest.Schema} Kafka-rest schema instance. */
    this.keySchema = null;

    if (opts.keySchema) {
      this.keySchema = new KafkaRest.AvroSchema(opts.keySchema);
    }

    /** @type {kafka-rest.topic} The kafka-rest topic instance. */
    this.kafkaTopic = this.kafka.topic(this.topic);

    this._produce = Promise.promisify(this.kafkaTopic.produce.bind(this.kafkaTopic));

    /** @type {Object} A logger to use, must expose the `info` and `error` methods. */
    this.log = opts.log;
  }

  /**
   * Produce a kafka message.
   *
   * @param {Object} data Data to send.
   * @param {number=} optRetries If this operation has been retried, count it.
   * @return {Promise} A Promise.
   */
  produce (data, optRetries) {
    let producePromise;

    if (this.keySchema) {
      producePromise = this._produce(this.keySchema, this.schema, data);
    } else {
      producePromise = this._produce(this.schema, data);
    }

    return producePromise
      .catch((err) => {
        let retries = optRetries || 1;

        this.log.error('kafka.Producer.produce Error for topic:', this.topic,
          'Retry:', retries, 'Error:', err.message);

        if (retries && retries >= this.retryTimes) {
          var error = new Error('Max retries exceeded');
          error.source = err;
          error.topic = this.topic;
          error.retries = optRetries;
          this.log.error('kafka.Producer.produce Error Max Retries exceeded',
            'for topic:', this.topic, 'Message:', data);
          throw error;
        }

        // retry...
        retries++;

        return new Promise((resolve)  => {
          setTimeout(resolve, this.retryInterval);
        })
          .then(() => {
            return this.produce(data, retries);
          });
      });
  }
};
