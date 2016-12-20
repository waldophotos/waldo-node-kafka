/*
 * kafka-node
 * Kafka library for node
 * https://github.com/waldo/waldo-node-kafka
 *
 * Copyright © Waldo, Inc.
 * All rights reserved.
 */

/**
 * @fileOverview bootstrap and master exporing module.
 */

const Consumer = require('./consumer');
const Producer = require('./producer');
const kafkaConnect = require('./kafka-connect');

const nodeKafka = module.exports = {};

nodeKafka.Consumer = Consumer;
nodeKafka.Producer = Producer;
nodeKafka.setKafkaUrl = kafkaConnect.setKafkaUrl;
