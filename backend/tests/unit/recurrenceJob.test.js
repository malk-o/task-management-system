'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { startRecurrenceJob } = require('../../src/scheduler/recurrenceJob');

describe('RecurrenceJob (unit)', () => {
  it('runsOnStartUp_generatesOccurrencesForToday', () => {
    const calls = [];
    const recurrenceService = { generateDue: (date) => { calls.push(date); return 0; } };
    const clock = { now: () => new Date('2026-11-12T08:00:00.000Z') };

    const stop = startRecurrenceJob({
      recurrenceService, clock, intervalMs: 60000, logger: { log() {}, error() {} },
    });
    stop();

    assert.deepEqual(calls, ['2026-11-12']);
  });
});