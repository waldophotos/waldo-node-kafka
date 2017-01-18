# Waldo Node Kafka

> Kafka library for Node.

[![CircleCI](https://circleci.com/gh/waldophotos/waldo-node-kafka.svg?style=svg&circle-token=779140ad9cf7a7f1e7a224e37821dce0a724d578)](https://circleci.com/gh/waldophotos/waldo-node-kafka)

## Install

Install the module using NPM:

```
npm install @waldo/node-kafka --save
```

## Documentation

The Node Kafka library requires Node.js 6 or later.

### The Consumer

The Consumer Constructor is a wrapper around the [kafka-rest package](https://github.com/confluentinc/kafka-rest-node) and its main purpose is to abstract away the kafka-rest interface and cope with connection issues or topic-not-found type of errors behind the scenes. You can now focus on your business.

The constructor requires an object as argument which has the following keys:

* `topic` **String Required** The Kafka topic the consumer will work on.
* `log` **Object Required** A logger to use, must expose the `info` and `error` methods.
* `retryInterval` **Number** How long to wait before retrying a failed connection or topic not found problems, expressed in milliseconds, default: 10 seconds.

```js
const kafkaLib = require('@waldo/node-kafka');
const logger = require('./logger'); // bunyan logger

const consumer = new kafkaLib.Consumer({
    topic: 'the-kafka-topic',
    log: logger,
});
```

#### Consumer.connect(opts)

This is the main entry point for consuming kafka messages. The method accepts one argument with options:

* `consumerGroup` **String Required** Define the consumer group.
* `onMessage` **Function Required** Callback to handle single incoming kafka messages.
* `onError` **Function** Callback to handle stream errors.
* `consumerOpts` **Object** Options to pass to kafka-rest consumer instance.

Returns a Promise.

```js
consumer.connect({
    consumerGroup: 'the-consumer-group',
    onMessage: function(data) {},
    onError: function(err) {},
    consumerOpts: {
        // these are the default values used when 'consumerOpts' not set.
        'format': 'avro',
        'auto.commit.enable': true,
        'auto.offset.reset': 'smallest',        
    },
})
    .then(function() {
        console.log('all good');
    })
```

#### Consumer.dispose()

This will destroy the consumer instance safely shutting down the kafka consumer connection.

Returns a Promise which you should wait on to ensure safe shutdown.

### The Producer

A thin wrapper around kafka-rest message producing.

The constructor requires an object as argument which has the following keys:

* `topic` **String REQUIRED** The Kafka topic the producer will emit messages on.
* `log` **Object REQUIRED** A logger to use, must expose the `info` and `error` methods.
* `schema` **Object REQUIRED** The topic schema as generated by waldo-schema, this needs to be an Object Literal, not an Avro instance.
* `keySchema` **Object** The topic key schema as generated by waldo-schema, this needs to be an Object Literal specifying the Avro type of the key, not an Avro instance. **Warning**: When defined, the value object needs to contain these two root values: `key` and `value`.
* `retryInterval` **Number** How long to wait before retrying a failed connection or topic not found problems, expressed in milliseconds, default: 5 seconds.
* `retryTimes` **Number** How many times to retry before giving up, default: 5 seconds.

```js
const kafkaLib = require('@waldo/node-kafka');

const logger = require('./logger'); // bunyan logger
const topicSchema = require('./schema');

const producer = new kafkaLib.Producer({
    topic: 'the-kafka-topic',
    schema: topicSchema,
    keySchema: { type: 'string' },
    log: logger,
});
```

#### Producer.produce(data)

Produces a log message to kafka using the provided data. There are two distinct ways to produce a message, using the key schema or not.

**Producing with key schema**

```js
const value = { customData: true };

producer.produce({
    key: 'my key',
    value: value,
})
    .then(function() {
        console.log('Produced!');
    })
```

**Producing without key schema**

```js
const value = { customData: true };

producer.produce(value)
    .then(function() {
        console.log('Produced!');
    })
```

When the producer fails, it will reject with an Error instance which contains these two additional properties:

* `source` **Error** The original error thrown by kafka-rest.
* `topic` **String** The name of the topic the producer would produce.
* `retries` **Number** How many times producer tried to produce the log message.

### Helper methods

#### kafkaLib.setKafkaUrl(url)

You can manually define the kafka proxy endpoint using this method. However for this method to take effect you need to invoke it before either any Consumer or Producer ctors have been instantiated.

Node Kafka library will resolve the kafka proxy url using the following rules:

1. Check if any user defined urls have been set using the `setKafkaUrl` method.
2. Check if there is any value set on the env variable `KAFKA_REST_PROXY_URL`.
3. Use the default `http://127.0.0.1:8082` address.

## Releasing

1. Update the changelog bellow.
1. Ensure you are on master.
1. Type: `grunt release`
* `grunt release:minor` for minor number jump.
    * `grunt release:major` for major number jump.

## Release History

- **v0.1.0**, *18 Jan 2017*
    - If no key-schema is defined then the producer will omit it as an invoking argument.
    - Refactored producer so it uses promisification instead of node callbacks.
- **v0.0.10**, *09 Jan 2017*
    - Will now exit the application after capturing and handling the SIGINT and SIGTERM events.
- **v0.0.9**, *05 Jan 2017*
    - Producer's error logs will now include the retry count.
- **v0.0.8**, *04 Jan 2017*
    - Enriched log messages to include topic name.
    - Producer error now returns topic name as well.
- **v0.0.7**, *30 Dec 2016*
    - Require specifying a key schema and message key.
- **v0.0.5**, *23 Dec 2016*
    - Fixed bug where subsequent calls to `kafkaConnect.connect()` would not return KAFKA_PROXY_URL as expected.
- **v0.0.3**, *22 Dec 2016*
    - Will detect and handle a Kafka disconnect by resetting the consumer and retrying to connect.
    - Will now log kafka proxy url on consumer connect.
    - Fixed consumer dispose method failing when a connection has not been established.
- **v0.0.2**, *22 Dec 2016*
    - Added SIGTERM listener for proper shutdown as well.
- **v0.0.1**, *21 Dec 2016*
    - Big Bang

## License

Copyright Waldo, Inc. All rights reserved.
