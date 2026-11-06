'use strict';

const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { createNotificationService } = require('../../src/services/notificationService');
const events = require('../../src/events/events');
const { NotFoundError } = require('../../src/errors/errors');

/**
 * FR5 unit tests (US5). The repositories are mocks, so no database is needed.
 */
const SARA = 10;
const MONA = 20;
const TASK_ID = 100;
const PROJECT_ID = 1;
const NOW = new Date('2026-11-10T10:00:00.000Z');

function setup({ task, managers = [], stored = null }) {
  const saved = [];
  const notificationRepository = {
    save: mock.fn((n) => { saved.push(n); return { id: 1, ...n }; }),
    findById: mock.fn(() => stored),
  };
  const taskRepository = { findById: mock.fn(() => task) };
  const projectMemberRepository = { findByProjectIdAndRole: mock.fn(() => managers) };
  const service = createNotificationService({
    notificationRepository, taskRepository, projectMemberRepository, clock: { now: () => NOW },
  });
  return { service, saved, notificationRepository, taskRepository, projectMemberRepository };
}

describe('NotificationService (unit)', () => {
  let task;

  beforeEach(() => {
    task = { id: TASK_ID, title: 'Prepare demo', projectId: PROJECT_ID, assigneeId: SARA, dueDate: null };
  });

  it('assignTask_createsOneNotificationForAssignee', () => {
    const { service, saved } = setup({ task });

    service.onEvent(events.taskAssigned(TASK_ID, SARA, MONA));

    assert.equal(saved.length, 1);
    assert.equal(saved[0].recipientId, SARA);
    assert.equal(saved[0].type, 'TASK_ASSIGNED');
    assert.match(saved[0].message, /Prepare demo/);
    assert.equal(saved[0].read, false);
  });

  it('statusChange_notifiesAssigneeAndManager', () => {
    const { service, saved } = setup({ task, managers: [{ userId: MONA }] });

    service.onEvent(events.taskStatusChanged(TASK_ID, 'TODO', 'IN_PROGRESS', SARA));

    assert.deepEqual(saved.map((n) => n.recipientId).sort(), [SARA, MONA]);
    assert.ok(saved.every((n) => n.type === 'STATUS_CHANGED'));
    assert.match(saved[0].message, /To Do.*In Progress/);
  });

  it('statusChange_whenManagerIsAlsoAssignee_notifiesOnlyOnce', () => {
    const { service, saved } = setup({ task, managers: [{ userId: SARA }] });

    service.onEvent(events.taskStatusChanged(TASK_ID, 'IN_PROGRESS', 'DONE', SARA));

    assert.equal(saved.length, 1);
  });

  it('validMention_createsExactlyOneNotification', () => {
    const { service, saved } = setup({ task });

    service.onEvent(events.mentionCreated(TASK_ID, MONA, SARA));

    assert.equal(saved.length, 1);
    assert.equal(saved[0].recipientId, MONA);
    assert.equal(saved[0].type, 'MENTION');
  });

  it('dueSoonEvent_notifiesAssignee', () => {
    const { service, saved } = setup({ task });

    service.onEvent(events.taskDueSoon(TASK_ID));

    assert.equal(saved.length, 1);
    assert.equal(saved[0].recipientId, SARA);
    assert.equal(saved[0].type, 'DUE_SOON');
  });

  it('dueSoonEvent_withoutAssignee_createsNothing', () => {
    task.assigneeId = null;
    const { service, saved } = setup({ task });

    service.onEvent(events.taskDueSoon(TASK_ID));

    assert.equal(saved.length, 0);
  });

  it('unknownEvent_isIgnored', () => {
    const { service, saved, taskRepository } = setup({ task });

    service.onEvent({ type: 'SOMETHING_ELSE' });

    assert.equal(saved.length, 0);
    assert.equal(taskRepository.findById.mock.callCount(), 0);
  });

  it('eventForMissingTask_throwsNotFound', () => {
    const { service } = setup({ task: null });

    assert.throws(() => service.onEvent(events.taskAssigned(999, SARA, MONA)), NotFoundError);
  });

  it('markAsRead_setsReadFlag', () => {
    const stored = { id: 5, recipientId: SARA, taskId: TASK_ID, type: 'MENTION', message: 'hi', createdAt: 'x', read: false };
    const { service, notificationRepository } = setup({ task, stored });

    const result = service.markAsRead(5, SARA);

    assert.equal(result.read, true);
    assert.equal(notificationRepository.save.mock.callCount(), 1);
  });

  it('markAsRead_ofAnotherUsersNotification_isNotFound', () => {
    const stored = { id: 5, recipientId: SARA, taskId: TASK_ID, type: 'MENTION', message: 'hi', createdAt: 'x', read: false };
    const { service, notificationRepository } = setup({ task, stored });

    assert.throws(() => service.markAsRead(5, MONA), NotFoundError);
    assert.equal(notificationRepository.save.mock.callCount(), 0);
  });
});
