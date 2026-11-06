'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DailyRecurrenceStrategy } = require('../../src/strategies/dailyRecurrenceStrategy');

test('dailyRule_returnsNextDay', () => {
  const strategy = new DailyRecurrenceStrategy();
  assert.equal(strategy.next('2026-11-06', {}), '2026-11-07');
  assert.equal(strategy.next('2026-12-31', {}), '2027-01-01');
});