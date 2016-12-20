/**
 * @fileOverview Generic consumer library for Kafka.
 */
const Promise = require('bluebird');

const kafkaBoot = require('./kafka');

/** @const {number} how log to wait before retrying a connection in ms */
const RETRY_INTERVAL = 5000;

module.exports = class Consumer {
  /**
   * The constructor.
   *
   * @param {Object} opts Required options:
   *   @param {string} topic The Kafka topic this consumer will work on.
   *   @param {Object} log A logger to use, must expose the `info` and `error`
   *     methods.
   * @constructor
   */
  constructor (opts) {
    /** @type {string} The kafka topic this consumer will work on. */
    this.topic = opts.topic;
    /** @type {?kafka-rest.Consumer} Consumer instance of kafka-rest package. */
    this.consumerInstance = null;

    // init local kafka-rest instance
    kafkaBoot.init();

    /** @type {kafka-rest} The kafka-rest instance. */
    this.kafka = kafkaBoot.kafka;
    /** @type {?Object} The options used to boot the consumer. */
    this.opts = null;
    /** @type {boolean} Indicates if this instance has been disposed. */
    this._isDisposed = false;
    /** @type {Function} store binded ref to fn so we can unregister it. */
    this.__disposeBinded = this.dispose.bind(this);
    /** @type {Function} store binded ref to fn so we can unregister it. */
    this.__onDataBinded = this._onData.bind(this);
    /** @type {Function} store binded ref to fn so we can unregister it. */
    this.__onErrorBinded = this._onError.bind(this);
    /** @type {?stream} Kafka stream reference. */
    this.stream = null;

    /** @type {Object} A logger to use, must expose the `info` and `error` methods. */
    this.log = opts.log;

    /** @type {number} measure connection retries */
    this.connectRetries = 0;

  }

  /**
   * Boot the consumer. If a connection is not possible, the consumer will retry
   * to connect until it eventually succeeds, this method will not reject.
   *
   * @param {Object} opts set of options:
   *   @param {string} consumerGroup Required, the consumer group.
   *   @param {Function} onMessage Required, dispatches events for single
   *     incoming messages.
   *   @param {Function=} onError dispatches events on stream errors.
   *   @param {Object=} consumerOpts Options to pass to kafka-rest consumer
   *     instance.
   * @return {Promise(kafka-rest.Consumer)} A Promise with the kafka-rest
   *   consumer instance.
   */
  connect (opts) {
    return new Promise((resolve) => {
      this.opts = opts;

      let consumerOpts = opts.consumerOpts || {
        'format': 'avro',
        'auto.commit.enable': true,
        'auto.offset.reset': 'smallest',
      };

      this.log.info('kafka.consumer.init() :: Initializing consumer for topic:',
        this.topic, 'on group:', opts.consumerGroup);

      this.kafka.consumer(opts.consumerGroup)
        .join(consumerOpts, (err, consumerInstance) => {
          if (err) {
            this.connectRetries++;

            this.log.error('kafka.consumer.init() :: Failed to connect. Retry:',
              this.connectRetries);

            setTimeout(() => {
              this.connect.bind(this, opts)
                .then(resolve);
            }, RETRY_INTERVAL);
            return;
          }

          this.connectRetries = 0;

          this.log.info('kafka.consumer.init() :: Consumer Online for topic:', this.topic);

          this.consumerInstance = consumerInstance;

          process.on('SIGINT', this.__disposeBinded);

          let stream = consumerInstance.subscribe(this.topic);
          stream.on('data', this.__onDataBinded);
          stream.on('error', this.__onErrorBinded);

          this.stream = stream;

          resolve(consumerInstance);
        });
    });
  }

  /**
   * Handle incoming messages, split them up and invoke listener for each.
   *
   * @param {Array.<Object>} msgs Kafka inbound messages.
   * @private
   */
  _onData (msgs) {
    if (typeof this.opts.onMessage !== 'function') {
      return;
    }
    for (var i = 0, len = msgs.length; i < len; i++) {
      this.opts.onMessage(msgs[i]);
    }
  }

  _onError (err) {
    if (typeof this.opts.onError === 'function') {
      this.opts.onError(err);
    }
  }

  /**
   * Dispose the instance, safely shutdown consumer, nuke all local vars.
   *
   * @return {Promise} ASYNC!.
   */
  dispose () {
    return new Promise((resolve) => {
      if (this._isDisposed) {
        resolve();
        return;
      }
      this._isDisposed = true;

      this.log.info('kafka.consumer.dispose() :: shutting down consuner...');

      this.stream.removeListener('data', this.__onDataBinded);
      this.stream.removeListener('error', this.__onErrorBinded);
      this.stream.removeAllListeners();
      process.removeListener('SIGINT', this.__disposeBinded);

      if (this.consumerInstance) {
        this.consumerInstance.shutdown(() => {
          this._nukeLocals();
          resolve();
        });
      } else {
        this._nukeLocals();
        resolve();
      }
    });
  }

  /**
   * Nuke local variables.
   *
   */
  _nukeLocals () {
    this.consumerInstance = null;
    this.stream = null;
    this.topic = null;
    this.kafka = null;
    this.opts = null;
    this.__disposeBinded = null;
    this.__onDataBinded = null;
    this.__onErrorBinded = null;
    this.log = null;
  }
};
