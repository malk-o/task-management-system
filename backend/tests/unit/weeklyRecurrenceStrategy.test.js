'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WeeklyRecurrenceStrategy } = require('../../src/strategies/weeklyRecurrenceStrategy');

test('mondayThursdayRule_createsExactlyTwoTasksPerWeek', () => {
  const strategy = new WeeklyRecurrenceStrategy();
  const rule = { daysOfWeek: [1, 4] }; // 1 = Monday ... 7 = Sunday
  const dates = [];
  let date = strategy.next('2026-11-01', rule); // Sunday
  while (date <= '2026-11-08') {
    dates.push(date);
    date = strategy.next(date, rule);
  }
  assert.deepEqual(dates, ['2026-11-02', '2026-11-05']);
});