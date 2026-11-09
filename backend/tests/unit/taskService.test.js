'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createTaskService } = require('../../src/services/taskService');
const { createTaskFactory } = require('../../src/factories/taskFactory');
const { NotFoundError, InvalidRequestError } = require('../../src/errors/errors');

/** Fakes: no database. They record what the service does so the tests can check it. */
function buildFakes() {
  const saved = [];
  const published = [];
  const accessChecks = [];
  const members = new Set(['1:1', '1:2']); // project 1: user 1 (manager) and user 2
  const tasks = new Map();

  const taskRepository = {
    save: (task) => {
      const stored = { ...task, id: task.id ?? 100 + saved.length };
      saved.push(stored);
      tasks.set(stored.id, stored);
      return stored;
    },
    findById: (id) => tasks.get(id) ?? null,
    findByProjectId: (projectId) => [...tasks.values()].filter((t) => t.projectId === projectId),
  };
  const projectRepository = { findById: (id) => (id === 1 ? { id: 1, name: 'Demo' } : null) };
  const projectMemberRepository = {
    existsByProjectIdAndUserId: (projectId, userId) => members.has(`${projectId}:${userId}`),
  };
  const accessControlService = {
    requireManager: (userId, projectId) => accessChecks.push(['manager', userId, projectId]),
    requireMember: (userId, projectId) => accessChecks.push(['member', userId, projectId]),
  };
  const eventPublisher = { publish: (event) => published.push(event) };

  return {
    saved, published, accessChecks, tasks,
    deps: {
      taskRepository, projectRepository, projectMemberRepository, accessControlService, eventPublisher,
      taskFactory: createTaskFactory(), runInTransaction: (work) => work(),
    },
  };
}

describe('TaskService (unit)', () => {
  let fakes;
  let service;

  beforeEach(() => {
    fakes = buildFakes();
    service = createTaskService(fakes.deps);
  });

  describe('createTask', () => {
    it('createTask_savesATodoTaskInTheProject', () => {
      const task = service.createTask(1, { projectId: 1, title: 'Write report' });

      assert.equal(task.status, 'TODO');
      assert.equal(task.projectId, 1);
      assert.equal(fakes.saved.length, 1);
    });

    it('createTask_checksThatTheUserIsAManagerOfTheProject', () => {
      service.createTask(1, { projectId: 1, title: 'Write report' });
      assert.deepEqual(fakes.accessChecks, [['manager', 1, 1]]);
    });

    it('createTaskWithAssignee_publishesTaskAssignedAfterSaving', () => {
      const task = service.createTask(1, { projectId: 1, title: 'Write report', assigneeId: 2 });

      assert.equal(task.assigneeId, 2);
      assert.equal(fakes.published.length, 1);
      assert.equal(fakes.published[0].type, 'TASK_ASSIGNED');
      assert.equal(fakes.published[0].taskId, task.id);
      assert.equal(fakes.published[0].assigneeId, 2);
      assert.equal(fakes.published[0].assignedByUserId, 1);
    });

    it('createTaskWithoutAssignee_publishesNothing', () => {
      service.createTask(1, { projectId: 1, title: 'Write report' });
      assert.equal(fakes.published.length, 0);
    });

    it('createTask_assigneeWhoIsNotAMember_isRejectedWithNothingSaved', () => {
      assert.throws(
        () => service.createTask(1, { projectId: 1, title: 'A', assigneeId: 99 }),
        InvalidRequestError,
      );
      assert.equal(fakes.saved.length, 0);
      assert.equal(fakes.published.length, 0);
    });

    it('createTask_unknownProject_isNotFound', () => {
      assert.throws(() => service.createTask(1, { projectId: 42, title: 'A' }), NotFoundError);
    });

    it('createTask_withoutTitle_isRejected', () => {
      assert.throws(() => service.createTask(1, { projectId: 1 }), InvalidRequestError);
      assert.equal(fakes.saved.length, 0);
    });
  });

  describe('assignTask', () => {
    let task;
    beforeEach(() => {
      task = service.createTask(1, { projectId: 1, title: 'Write report' });
    });

    it('assignTask_setsTheAssigneeAndPublishesTaskAssigned', () => {
      const updated = service.assignTask(task.id, 2, 1);

      assert.equal(updated.assigneeId, 2);
      assert.equal(fakes.tasks.get(task.id).assigneeId, 2);
      assert.equal(fakes.published.length, 1);
      assert.equal(fakes.published[0].type, 'TASK_ASSIGNED');
      assert.equal(fakes.published[0].assigneeId, 2);
    });

    it('assignTask_checksThatTheUserIsAManagerOfTheTasksProject', () => {
      fakes.accessChecks.length = 0;
      service.assignTask(task.id, 2, 1);
      assert.deepEqual(fakes.accessChecks, [['manager', 1, 1]]);
    });

    it('assignTask_toANonMember_isRejectedWithNoEvent', () => {
      assert.throws(() => service.assignTask(task.id, 99, 1), InvalidRequestError);
      assert.equal(fakes.published.length, 0);
    });

    it('assignTask_unknownTask_isNotFound', () => {
      assert.throws(() => service.assignTask(555, 2, 1), NotFoundError);
    });

    it('assignTask_toTheCurrentAssignee_doesNotNotifyAgain', () => {
      service.assignTask(task.id, 2, 1);
      service.assignTask(task.id, 2, 1);
      assert.equal(fakes.published.length, 1);
    });
  });

  describe('listProjectTasks', () => {
    it('listProjectTasks_requiresMembershipAndReturnsTheProjectsTasks', () => {
      service.createTask(1, { projectId: 1, title: 'One' });
      service.createTask(1, { projectId: 1, title: 'Two' });
      fakes.accessChecks.length = 0;

      const list = service.listProjectTasks(1, 2);

      assert.equal(list.length, 2);
      assert.deepEqual(fakes.accessChecks, [['member', 2, 1]]);
    });

    it('listProjectTasks_unknownProject_isNotFound', () => {
      assert.throws(() => service.listProjectTasks(42, 1), NotFoundError);
    });
  });
});