'use strict';

const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { createStatusService } = require('../../src/services/statusService');
const events = require('../../src/events/events');
const { InvalidRequestError, NotFoundError, ForbiddenError } = require('../../src/errors/errors');

/** FR3 / NFR3 unit tests (US3). Repositories are mocks, so no database is needed. */
const NOW = new Date('2026-11-10T10:00:00.000Z');
const TASK_ID = 5;
const USER_ID = 2;

function setup({ status = 'TODO', task } = {}) {
  const stored = task === undefined ? { id: TASK_ID, projectId: 1, status, title: 'T' } : task;
  const taskRepository = {
    findById: mock.fn(() => (stored ? { ...stored } : null)),
    save: mock.fn((t) => t),
  };
  const statusLogRepository = { append: mock.fn((e) => e) };
  const eventPublisher = { publish: mock.fn() };
  const accessControlService = { requireMember: mock.fn() };
  const runInTransaction = mock.fn((work) => work());
  const service = createStatusService({
    taskRepository, statusLogRepository, eventPublisher, accessControlService,
    runInTransaction, clock: { now: () => NOW },
  });
  return { service, taskRepository, statusLogRepository, eventPublisher, accessControlService, runInTransaction };
}

describe('StatusService.changeStatus (unit)', () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });

  it('validTransition_updatesTheTaskStatus', () => {
    const result = ctx.service.changeStatus(TASK_ID, USER_ID, 'IN_PROGRESS');

    assert.equal(result.status, 'IN_PROGRESS');
    assert.equal(ctx.taskRepository.save.mock.calls[0].arguments[0].status, 'IN_PROGRESS');
  });

  it('validTransition_logsOldStatusNewStatusUserAndTimestamp', () => {
    ctx.service.changeStatus(TASK_ID, USER_ID, 'IN_PROGRESS');

    assert.equal(ctx.statusLogRepository.append.mock.callCount(), 1);
    assert.deepEqual(ctx.statusLogRepository.append.mock.calls[0].arguments[0], {
      taskId: TASK_ID,
      oldStatus: 'TODO',
      newStatus: 'IN_PROGRESS',
      changedBy: USER_ID,
      changedAt: NOW.toISOString(),
    });
  });

  it('statusChangeAndLog_runInsideOneTransaction', () => {
    ctx.service.changeStatus(TASK_ID, USER_ID, 'IN_PROGRESS');

    assert.equal(ctx.runInTransaction.mock.callCount(), 1);
  });

  it('validTransition_publishesTaskStatusChangedEvent', () => {
    ctx.service.changeStatus(TASK_ID, USER_ID, 'IN_PROGRESS');

    assert.equal(ctx.eventPublisher.publish.mock.callCount(), 1);
    const event = ctx.eventPublisher.publish.mock.calls[0].arguments[0];
    assert.equal(event.type, events.EventType.TASK_STATUS_CHANGED);
    assert.equal(event.taskId, TASK_ID);
    assert.equal(event.oldStatus, 'TODO');
    assert.equal(event.newStatus, 'IN_PROGRESS');
    assert.equal(event.changedByUserId, USER_ID);
  });

  it('toDoToDone_isRejected_withNoLogAndNoEvent', () => {
    assert.throws(() => ctx.service.changeStatus(TASK_ID, USER_ID, 'DONE'), InvalidRequestError);

    assert.equal(ctx.taskRepository.save.mock.callCount(), 0);
    assert.equal(ctx.statusLogRepository.append.mock.callCount(), 0);
    assert.equal(ctx.eventPublisher.publish.mock.callCount(), 0);
  });

  it('doneTask_cannotBeChanged', () => {
    ctx = setup({ status: 'DONE' });

    assert.throws(() => ctx.service.changeStatus(TASK_ID, USER_ID, 'IN_PROGRESS'), InvalidRequestError);
  });

  it('unknownTargetStatus_isRejected', () => {
    assert.throws(() => ctx.service.changeStatus(TASK_ID, USER_ID, 'ARCHIVED'), InvalidRequestError);
  });

  it('unknownTask_isNotFound', () => {
    ctx = setup({ task: null });

    assert.throws(() => ctx.service.changeStatus(99, USER_ID, 'IN_PROGRESS'), NotFoundError);
  });

  it('accessControl_isCheckedForTheTasksProject', () => {
    ctx.service.changeStatus(TASK_ID, USER_ID, 'IN_PROGRESS');

    assert.deepEqual(ctx.accessControlService.requireMember.mock.calls[0].arguments, [USER_ID, 1]);
  });

  it('nonMember_isDenied_withNoChange', () => {
    ctx.accessControlService.requireMember = mock.fn(() => { throw new ForbiddenError('not a member'); });
    const denied = createStatusService({
      taskRepository: ctx.taskRepository, statusLogRepository: ctx.statusLogRepository,
      eventPublisher: ctx.eventPublisher, accessControlService: ctx.accessControlService,
      runInTransaction: (work) => work(), clock: { now: () => NOW },
    });

    assert.throws(() => denied.changeStatus(TASK_ID, 9, 'IN_PROGRESS'), ForbiddenError);
    assert.equal(ctx.statusLogRepository.append.mock.callCount(), 0);
    assert.equal(ctx.eventPublisher.publish.mock.callCount(), 0);
  });
});
describe('StatusService.getStatusLog (unit)', () => {
  it('getStatusLog_returnsTheEntriesOfTheTask', () => {
    const ctx = setup();
    const entries = [{ id: 1, taskId: TASK_ID }];
    const service = createStatusService({
      taskRepository: ctx.taskRepository, statusLogRepository: { findByTaskId: () => entries },
      eventPublisher: ctx.eventPublisher, accessControlService: ctx.accessControlService,
      runInTransaction: (work) => work(), clock: { now: () => NOW },
    });

    assert.deepEqual(service.getStatusLog(TASK_ID, USER_ID), entries);
    assert.deepEqual(ctx.accessControlService.requireMember.mock.calls[0].arguments, [USER_ID, 1]);
  });
});