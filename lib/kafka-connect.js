/**
 * @fileOverview Manages Kafka singleton instance.
 */

const KafkaRest = require('kafka-rest');

let userDefinedKafkaUrl = null;

/**
 * The kafka-rest singleton handler.
 *
 * @type {Object}
 */
const kafkaConnect = module.exports = {};

/** @type {?kafka-rest} Instance of kafka-rest */
kafkaConnect.kafka = null;

/**
 * Manually define the kafka url.
 *
 * @param {string} url The kafka url.
 */
kafkaConnect.setKafkaUrl = function(url) {
  userDefinedKafkaUrl = url;
};

/**
 * Initialize kafka.
 *
 * @return {string} The proxy url used to connect.
 */
kafkaConnect.connect = function () {
  if (kafkaConnect.kafka) {
    return;
  }

  const KAFKA_PROXY_URL = userDefinedKafkaUrl ||
    process.env.KAFKA_REST_PROXY_URL ||
    'http://127.0.0.1:8082';

  kafkaConnect.kafka = new KafkaRest({
    url: KAFKA_PROXY_URL,
  });

  return KAFKA_PROXY_URL;
};
