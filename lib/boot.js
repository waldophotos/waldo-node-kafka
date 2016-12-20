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

const nodeKafka = module.exports = {};

nodeKafka.Consumer = Consumer;
