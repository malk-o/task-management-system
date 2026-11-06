'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');

/**
 * FR5 integration tests for the due-soon rule.
 * Real service, real event publisher, real in-memory SQLite database.
 */
describe('DueSoonService (integration)', () => {
  let c;
  let data;
  let sara;
  let project;

  beforeEach(() => {
    c = buildTestContainer();
    data = testData(c);
    sara = data.user('Sara');
    project = data.project();
  });

  it('dueIn23Hours_sendsExactlyOneDueSoon', () => {
    const task = data.task({ project, assignee: sara, title: 'Prepare demo', dueDate: data.inHours(23) });

    const firstRun = c.dueSoonService.notifyDueSoonTasks();
    const secondRun = c.dueSoonService.notifyDueSoonTasks();

    assert.equal(firstRun, 1);
    assert.equal(secondRun, 0);
    const notifications = c.notificationRepository.findByRecipientId(sara.id);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].type, 'DUE_SOON');
    assert.equal(notifications[0].taskId, task.id);
    assert.equal(c.taskRepository.findById(task.id).dueSoonNotified, true);
  });

  it('doneTask_sendsNoDueSoon', () => {
    data.task({ project, assignee: sara, dueDate: data.inHours(5), status: 'DONE' });

    assert.equal(c.dueSoonService.notifyDueSoonTasks(), 0);
    assert.equal(c.notificationRepository.findByRecipientId(sara.id).length, 0);
  });

  it('dueIn2Days_isOutsideTheWindow', () => {
    data.task({ project, assignee: sara, dueDate: data.inHours(48) });

    assert.equal(c.dueSoonService.notifyDueSoonTasks(), 0);
  });

  it('alreadyOverdueTask_isNotAnnouncedAsDueSoon', () => {
    data.task({ project, assignee: sara, dueDate: data.inHours(-2) });

    assert.equal(c.dueSoonService.notifyDueSoonTasks(), 0);
  });

  it('taskWithoutAssignee_isSkipped', () => {
    data.task({ project, assignee: null, dueDate: data.inHours(3) });

    assert.equal(c.dueSoonService.notifyDueSoonTasks(), 0);
  });

  it('taskBecomingDueLater_isAnnouncedWhenTimePasses', () => {
    data.task({ project, assignee: sara, dueDate: data.inHours(30) });
    assert.equal(c.dueSoonService.notifyDueSoonTasks(), 0);

    c.clock.set(new Date(c.clock.now().getTime() + 10 * 3600 * 1000)); // 10 hours later: now due in 20h

    assert.equal(c.dueSoonService.notifyDueSoonTasks(), 1);
  });
});
