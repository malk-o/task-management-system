'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const events = require('../../src/events/events');

/** NFR5: a notification must exist less than 5 seconds after the triggering event. */
const LIMIT_MS = 5000;

describe('Notification performance (NFR5)', () => {
  it('notification_deliveredWithin5Seconds', () => {
    const c = buildTestContainer();
    const data = testData(c);
    const sara = data.user('Sara');
    const project = data.project();
    const task = data.task({ project, assignee: sara, title: 'Prepare demo' });

    const start = process.hrtime.bigint();
    c.eventPublisher.publish(events.taskAssigned(task.id, sara.id, sara.id));
    const stored = c.notificationRepository.findByRecipientId(sara.id);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

    console.log(`NFR5 measured delivery time: ${elapsedMs.toFixed(2)} ms`);
    assert.equal(stored.length, 1);
    assert.ok(elapsedMs < LIMIT_MS, `took ${elapsedMs} ms`);
  });
});
