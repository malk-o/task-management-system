'use strict';

/** One clock for the whole app, so tests can replace it with a fixed time. */
const systemClock = { now: () => new Date() };

module.exports = { systemClock };
