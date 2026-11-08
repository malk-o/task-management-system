'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const { createStatusService } = require('../../src/services/statusService');

/** FR3 + NFR3 end to end inside the backend: real container, real SQLite, real Observer. */
describe('Status workflow (integration)', () => {
  let c;
  let sara;
  let mona;
  let task;

  beforeEach(() => {
    c = buildTestContainer();
    const data = testData(c);
    sara = data.user('Sara');
    mona = data.user('Mona');
    const project = data.project();
    data.member(project, mona, 'MANAGER');
    data.member(project, sara, 'MEMBER');
    task = data.task({ project, assignee: sara, title: 'Prepare demo' });
  });

  it('validChange_savesStatusAndLogEntry', () => {
    c.statusService.changeStatus(task.id, sara.id, 'IN_PROGRESS');

    assert.equal(c.taskRepository.findById(task.id).status, 'IN_PROGRESS');
    const [entry] = c.statusLogRepository.findByTaskId(task.id);
    assert.equal(entry.oldStatus, 'TODO');
    assert.equal(entry.newStatus, 'IN_PROGRESS');
    assert.equal(entry.changedBy, sara.id);
    assert.equal(entry.changedAt, c.clock.now().toISOString());
  });

  it('everyTransitionOfTheFullWorkflow_isLogged', () => {
    ['IN_PROGRESS', 'IN_REVIEW', 'DONE'].forEach((s) => c.statusService.changeStatus(task.id, sara.id, s));

    const log = c.statusLogRepository.findByTaskId(task.id);
    assert.deepEqual(log.map((e) => `${e.oldStatus}>${e.newStatus}`),
      ['TODO>IN_PROGRESS', 'IN_PROGRESS>IN_REVIEW', 'IN_REVIEW>DONE']);
  });

  it('invalidChange_leavesStatusUnchangedAndWritesNoLog', () => {
    assert.throws(() => c.statusService.changeStatus(task.id, sara.id, 'DONE'), /cannot move/i);

    assert.equal(c.taskRepository.findById(task.id).status, 'TODO');
    assert.equal(c.statusLogRepository.findByTaskId(task.id).length, 0);
  });

  it('ifTheLogWriteFails_theStatusChangeIsRolledBack', () => {
    const failing = createStatusService({
      taskRepository: c.taskRepository,
      statusLogRepository: { append() { throw new Error('disk full'); }, findByTaskId: () => [] },
      eventPublisher: c.eventPublisher,
      accessControlService: c.accessControlService,
      runInTransaction: c.runInTransaction,
      clock: c.clock,
    });

    assert.throws(() => failing.changeStatus(task.id, sara.id, 'IN_PROGRESS'), /disk full/);

    assert.equal(c.taskRepository.findById(task.id).status, 'TODO');
  });

  it('validChange_notifiesTheAssigneeAndTheManager_throughTheObserver', () => {
    c.statusService.changeStatus(task.id, sara.id, 'IN_PROGRESS');

    const types = (user) => c.notificationService.getNotificationsFor(user.id).map((n) => n.type);
    assert.deepEqual(types(sara), ['STATUS_CHANGED']);
    assert.deepEqual(types(mona), ['STATUS_CHANGED']);
  });

  it('invalidChange_sendsNoNotification', () => {
    assert.throws(() => c.statusService.changeStatus(task.id, sara.id, 'DONE'));

    assert.equal(c.notificationService.getNotificationsFor(sara.id).length, 0);
  });
});