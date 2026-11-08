'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createTaskFactory } = require('../../src/factories/taskFactory');
const { InvalidRequestError } = require('../../src/errors/errors');

/** FR2 (Factory pattern): the one place that builds a valid task. */
describe('TaskFactory (unit)', () => {
  const factory = createTaskFactory();

  it('newTask_defaultsToTodoStatusAndMediumPriority', () => {
    const task = factory.create({ projectId: 1, title: 'Write report' });

    assert.equal(task.status, 'TODO');
    assert.equal(task.priority, 'MEDIUM');
    assert.equal(task.projectId, 1);
    assert.equal(task.title, 'Write report');
  });

  it('title_isTrimmed', () => {
    assert.equal(factory.create({ projectId: 1, title: '  Write report  ' }).title, 'Write report');
  });

  it('statusRequestedByTheCaller_isIgnoredBecauseANewTaskIsAlwaysTodo', () => {
    assert.equal(factory.create({ projectId: 1, title: 'A', status: 'DONE' }).status, 'TODO');
  });

  it('missingTitle_isRejected', () => {
    assert.throws(() => factory.create({ projectId: 1 }), InvalidRequestError);
    assert.throws(() => factory.create({ projectId: 1, title: '   ' }), InvalidRequestError);
  });

  it('missingProject_isRejected', () => {
    assert.throws(() => factory.create({ title: 'A' }), InvalidRequestError);
  });

  it('unknownPriority_isRejected', () => {
    assert.throws(() => factory.create({ projectId: 1, title: 'A', priority: 'URGENT' }), InvalidRequestError);
  });

  it('invalidDueDate_isRejected', () => {
    assert.throws(() => factory.create({ projectId: 1, title: 'A', dueDate: 'not-a-date' }), InvalidRequestError);
  });

  it('dueDate_isStoredAsIsoText', () => {
    const task = factory.create({ projectId: 1, title: 'A', dueDate: '2026-11-20T10:00:00Z' });
    assert.equal(task.dueDate, '2026-11-20T10:00:00.000Z');
  });

  it('recurrenceFields_arePassedThrough', () => {
    const task = factory.create({
      projectId: 1, title: 'A', assigneeId: 2, ruleId: 7, occurrenceDate: '2026-11-11',
    });
    assert.equal(task.assigneeId, 2);
    assert.equal(task.ruleId, 7);
    assert.equal(task.occurrenceDate, '2026-11-11');
  });
});