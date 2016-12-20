/*
 * @fileOverview Main testing helper lib.
 */

var tester = module.exports = {};

/** @type {Object} simple logger */
tester.log = {
  info: function() {
    console.log.apply(null, ['INFO:'].concat(arguments));
  },
  error: function() {
    console.error.apply(null, ['ERROR:'].concat(arguments));
  },
};

/**
 * Have a Cooldown period between tests.
 *
 * @param {number} seconds cooldown in seconds.
 * @return {Function} use is beforeEach().
 */
tester.cooldown = function(seconds) {
  return function(done) {
    setTimeout(done, seconds);
  };
};
