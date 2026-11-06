'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MonthlyRecurrenceStrategy } = require('../../src/strategies/monthlyRecurrenceStrategy');

test('ruleOn31st_fallsBackToLastDayOfShorterMonths', () => {
  const strategy = new MonthlyRecurrenceStrategy();
  const rule = { dayOfMonth: 31 };
  assert.equal(strategy.next('2026-01-31', rule), '2026-02-28');
  assert.equal(strategy.next('2026-02-28', rule), '2026-03-31');
  assert.equal(strategy.next('2026-03-31', rule), '2026-04-30');
});

test('leapYear_feb29HandledCorrectly', () => {
  const strategy = new MonthlyRecurrenceStrategy();
  const rule = { dayOfMonth: 31 };
  assert.equal(strategy.next('2028-01-31', rule), '2028-02-29');
  assert.equal(strategy.next('2028-02-29', rule), '2028-03-31');
});