/**
 * @fileOverview Base API Surface tests.
 */
const chai = require('chai');
const expect = chai.expect;

const kafka = require('../..');

describe('Base API Surface', function() {
  it('should expose expected methods', function(){
    expect(kafka).to.have.keys([
      'Consumer',
    ]);
  });
});
