/**
 * @fileOverview Manages Kafka singleton instance.
 */

const KafkaRest = require('kafka-rest');

const KAFKA_PROXY_URL = process.env.KAFKA_REST_PROXY_URL || 'http://127.0.0.1:8082';

const kafkaConnect = module.exports = {};

/** @type {?kafka-rest} Instance of kafka-rest */
kafkaConnect.kafka = null;

/**
 * Initialize kafka.
 *
 */
kafkaConnect.connect = function () {
  if (kafkaConnect.kafka) {
    return;
  }

  kafkaConnect.kafka = new KafkaRest({
    url: KAFKA_PROXY_URL,
  });
};
