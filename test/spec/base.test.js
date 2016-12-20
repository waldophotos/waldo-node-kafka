/**
 * @fileOverview Base API Surface tests.
 */
const chai = require('chai');
const expect = chai.expect;

const kafkaLib = require('../..');

describe('Base API Surface', function() {
  it('should expose expected methods', function(){
    expect(kafkaLib).to.have.keys([
      'Consumer',
    ]);
  });
});
