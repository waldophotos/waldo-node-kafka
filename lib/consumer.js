/**
 * @fileOverview Generic consumer library for Kafka.
 */
const Promise = require('bluebird');

const kafkaConnect = require('./kafka-connect');

module.exports = class Consumer {
  /**
   * The constructor.
   *
   * @param {Object} opts Required options:
   *   @param {string} topic REQUIRED The Kafka topic this consumer will work on.
   *   @param {Object} log REQUIRED A logger to use, must expose the `info`
   *   and `error` methods.
   *   @param {number=} retryInterval How long to wait before retrying a connection.
   * @constructor
   */
  constructor (opts) {
    /** @type {string} The kafka topic this consumer will work on. */
    this.topic = opts.topic;
    /** @type {?kafka-rest.Consumer} Consumer instance of kafka-rest package. */
    this.consumerInstance = null;

    /** @type {number} how log to wait before retrying a connection in ms */
    this.retryInterval = opts.retryInterval || 10000;

    // init local kafka-rest instance and store proxyUrl
    this.proxyUrl = kafkaConnect.connect();


    /** @type {kafka-rest} The kafka-rest instance. */
    this.kafka = kafkaConnect.kafka;

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

    process.on('SIGINT', this._onAppExit.bind(this));
    process.on('SIGTERM', this._onAppExit.bind(this));
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

      this.log.info('kafka.consumer.connect() :: Initializing consumer for topic:',
        this.topic, 'on group:', opts.consumerGroup, 'using kafka proxy url:',
        this.proxyUrl);

      this.kafka.consumer(opts.consumerGroup)
        .join(consumerOpts, (err, consumerInstance) => {
          if (err) {
            this.connectRetries++;

            this.log.error('kafka.consumer.connect() :: Failed to connect. Topic:',
              this.topic, 'Retry:', this.connectRetries);

            setTimeout(() => {
              this.connect(opts)
                .then(resolve);
            }, this.retryInterval);
            return;
          }

          this.connectRetries = 0;

          this.log.info('kafka.consumer.connect() :: Consumer Online for topic:',
            this.topic);

          this.consumerInstance = consumerInstance;

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

  /**
   * Handle errors, detect topic not found and reset consumer.
   *
   * @param {Array.<Object>} msgs Kafka inbound messages.
   * @private
   */
  _onError (err) {
    //
    //
    // Catch "Topic not found" error
    //
    if (err.data && err.data['error_code'] === 40401) {
      // Topic not found error, suppress and restart...
      this.log.info('kafka.consumer._onError() :: Detected "topic not found"',
        'error for topic:', this.topic, '...resetting consumer...');

      this._resetConsumer();

      return;
    }

    //
    //
    // Catch connection lost with kafka
    //
    if (err.code && err.code === 'ECONNRESET') {
      // connection lost to kafka
      this.log.info('kafka.consumer._onError() :: Connection lost to kafka,',
        'topic:', this.topic, '...resetting consumer...');
      this._resetConsumer();
      return;
    }

    if (typeof this.opts.onError === 'function') {
      this.opts.onError(err);
    }
  }

  /**
   * Safely shutdown consumer and restart a new one.
   *
   */
  _resetConsumer () {
    this.log.info('kafka.consumer._resetConsumer() :: shutting down consumer',
      'for topic:', this.topic);

    // do not wait for shutdown callback on purpose, in case of topic not found
    // it will most probably hang there forever, since the runtime will not end
    // at this point and we are oppening a new connection right afterwards
    // it's ok.
    this.consumerInstance.shutdown();

    this._detachStream();

    // wait and reconnect...
    setTimeout(() => {
      this.connect(this.opts);
    }, this.retryInterval);
  }

  /**
   * Handle app exit signal calls, call dispose and exit app.
   */
  _onAppExit () {
    this.dispose()
      .finally(() => {
        process.exit();
      });
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

      this.log.info('kafka.consumer.dispose() :: shutting down consumer for',
        'topic:', this.topic);

      this._detachStream();

      process.removeListener('SIGINT', this.__disposeBinded);
      process.removeListener('SIGTERM', this.__disposeBinded);

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
   * Detach all listeners from consumer instance stream.
   *
   */
  _detachStream () {
    if (this.stream && typeof this.stream.removeListener === 'function') {
      this.stream.removeListener('data', this.__onDataBinded);
      this.stream.removeListener('error', this.__onErrorBinded);
      this.stream.removeAllListeners();
    }
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
    this.proxyUrl = null;
  }
};
