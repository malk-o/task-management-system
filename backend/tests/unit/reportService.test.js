'use strict';

const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const { createReportService } = require('../../src/services/reportService');
const { ForbiddenError } = require('../../src/errors/errors');

/** FR3 / US6: project report. Repositories are mocks. */
const NOW = new Date('2026-11-10T10:00:00.000Z');
const PAST = '2026-11-01T10:00:00.000Z';
const FUTURE = '2026-11-20T10:00:00.000Z';

const USERS = { 1: { id: 1, name: 'Mona' }, 2: { id: 2, name: 'Sara' }, 3: { id: 3, name: 'Omar' } };

function setup(tasks, { denyManager = false } = {}) {
  const accessControlService = {
    requireManager: mock.fn(() => { if (denyManager) throw new ForbiddenError('managers only'); }),
  };
  const taskRepository = { findByProjectId: mock.fn(() => tasks) };
  const userRepository = { findById: mock.fn((id) => USERS[id] ?? null) };
  const service = createReportService({
    taskRepository, userRepository, accessControlService, clock: { now: () => NOW },
  });
  return { service, accessControlService, taskRepository };
}

const t = (id, status, assigneeId, dueDate = null) => ({ id, title: `T${id}`, status, assigneeId, dueDate });

describe('ReportService (unit)', () => {
  it('threeDoneOfFour_completionRateIs75Percent', () => {
    const { service } = setup([t(1, 'DONE', 2), t(2, 'DONE', 2), t(3, 'DONE', 3), t(4, 'TODO', 3)]);

    const report = service.getProjectReport(1, 1);

    assert.equal(report.completionRate, 75);
    assert.equal(report.totalTasks, 4);
    assert.equal(report.doneTasks, 3);
  });

  it('noTasks_completionRateIsZero', () => {
    const { service } = setup([]);

    assert.equal(service.getProjectReport(1, 1).completionRate, 0);
  });

  it('overdue_isPastDueAndNotDone', () => {
    const { service } = setup([
      t(1, 'TODO', 2, PAST),
      t(2, 'IN_PROGRESS', 3, PAST),
      t(3, 'TODO', 2, FUTURE),
      t(4, 'TODO', 2, null),
    ]);

    const overdue = service.getProjectReport(1, 1).overdueTasks;

    assert.deepEqual(overdue.map((x) => x.id), [1, 2]);
  });

  it('overdue_excludesDoneTasks', () => {
    const { service } = setup([t(1, 'DONE', 2, PAST)]);

    assert.deepEqual(service.getProjectReport(1, 1).overdueTasks, []);
  });

  it('workload_countsOpenTasksPerAssignee', () => {
    const { service } = setup([
      t(1, 'TODO', 2), t(2, 'IN_PROGRESS', 2), t(3, 'DONE', 2), t(4, 'IN_REVIEW', 3),
    ]);

    const { workloadPerMember } = service.getProjectReport(1, 1);

    assert.deepEqual(workloadPerMember, [
      { userId: 2, name: 'Sara', openTasks: 2 },
      { userId: 3, name: 'Omar', openTasks: 1 },
    ]);
  });

  it('unassignedTasks_areNotCountedInTheWorkload', () => {
    const { service } = setup([t(1, 'TODO', null)]);

    assert.deepEqual(service.getProjectReport(1, 1).workloadPerMember, []);
  });

  it('onlyManagersMayViewTheReport', () => {
    const { service, accessControlService } = setup([], { denyManager: true });

    assert.throws(() => service.getProjectReport(1, 2), ForbiddenError);
    assert.deepEqual(accessControlService.requireManager.mock.calls[0].arguments, [2, 1]);
  });

  it('theReportIsOnlyBuiltAfterTheAccessCheck', () => {
    const { service, taskRepository } = setup([], { denyManager: true });

    assert.throws(() => service.getProjectReport(1, 2), ForbiddenError);
    assert.equal(taskRepository.findByProjectId.mock.callCount(), 0);
  });
});