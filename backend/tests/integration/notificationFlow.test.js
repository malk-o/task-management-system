'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const events = require('../../src/events/events');

/** Real wiring end to end (publisher -> NotificationService -> SQLite), without HTTP. */
describe('Notification flow (integration)', () => {
  it('statusChange_notifiesAssigneeAndManager_inDatabase', () => {
    const c = buildTestContainer();
    const data = testData(c);
    const sara = data.user('Sara');
    const mona = data.user('Mona');
    const project = data.project();
    data.member(project, mona, 'MANAGER');
    data.member(project, sara, 'MEMBER');
    const task = data.task({ project, assignee: sara, title: 'Write report' });

    c.eventPublisher.publish(events.taskStatusChanged(task.id, 'TODO', 'IN_PROGRESS', sara.id));

    assert.equal(c.notificationRepository.findByRecipientId(sara.id).length, 1);
    assert.equal(c.notificationRepository.findByRecipientId(mona.id).length, 1);
  });

  it('failingHandler_rollsBackAllNotificationsOfThatEvent', () => {
    const c = buildTestContainer();
    const data = testData(c);
    const sara = data.user('Sara');
    const project = data.project();
    const task = data.task({ project, assignee: sara });

    // the event refers to a task that does not exist -> handler throws
    assert.throws(() => c.eventPublisher.publish(events.taskAssigned(9999, sara.id, sara.id)));
    assert.equal(c.notificationRepository.findByRecipientId(sara.id).length, 0);
    assert.ok(task.id);
  });
});
