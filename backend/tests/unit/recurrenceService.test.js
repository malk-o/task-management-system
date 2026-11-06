'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createRecurrenceService } = require('../../src/services/recurrenceService');

/** Fake dependencies: no database, no real factory. */
function buildFakes() {
  const template = {
    id: 1, projectId: 1, title: 'Weekly report', description: 'Send the report',
    priority: 'HIGH', assigneeId: 2, dueDate: '2026-11-10T12:00:00.000Z',
  };
  const rules = [
    { id: 1, templateTaskId: 1, frequency: 'DAILY', daysOfWeek: null, dayOfMonth: null, endDate: null },
  ];
  const savedTasks = [];

  const taskRepository = {
    findById: (id) => (id === template.id ? template : null),
    findByRuleAndOccurrenceDate: (ruleId, date) =>
      savedTasks.find((t) => t.ruleId === ruleId && t.occurrenceDate === date) ?? null,
    save: (task) => {
      const saved = { ...task, id: 100 + savedTasks.length };
      savedTasks.push(saved);
      return saved;
    },
  };
  const recurrenceRuleRepository = {
    findAll: () => rules,
    save: (rule) => {
      const saved = { id: 50 + rules.length, endDate: null, daysOfWeek: null, dayOfMonth: null, ...rule };
      rules.push(saved);
      return saved;
    },
  };
  const taskFactory = { create: (fields) => ({ ...fields, status: 'TODO' }) };
  const runInTransaction = (work) => work();

  return { template, rules, savedTasks, taskRepository, recurrenceRuleRepository, taskFactory, runInTransaction };
}

describe('RecurrenceService (unit)', () => {
  let fakes;
  let service;

  beforeEach(() => {
    fakes = buildFakes();
    service = createRecurrenceService({
      recurrenceRuleRepository: fakes.recurrenceRuleRepository,
      taskRepository: fakes.taskRepository,
      taskFactory: fakes.taskFactory,
      runInTransaction: fakes.runInTransaction,
    });
  });

  it('sameOccurrenceTwice_createsOnlyOneTask', () => {
    const firstRun = service.generateDue('2026-11-11');
    const secondRun = service.generateDue('2026-11-11');

    assert.equal(firstRun, 1);
    assert.equal(secondRun, 0);
    assert.equal(fakes.savedTasks.length, 1);
  });

  it('afterEndDate_createsNoTask', () => {
    fakes.rules[0].endDate = '2026-11-10';

    const created = service.generateDue('2026-11-11');

    assert.equal(created, 0);
    assert.equal(fakes.savedTasks.length, 0);
  });

  it('occurrence_copiesTitleDescriptionPriorityAssignee', () => {
    service.generateDue('2026-11-11');

    const [created] = fakes.savedTasks;
    assert.equal(created.title, 'Weekly report');
    assert.equal(created.description, 'Send the report');
    assert.equal(created.priority, 'HIGH');
    assert.equal(created.assigneeId, 2);
    assert.equal(created.status, 'TODO');
  });

  it('dueDate_keepsSameOffset', () => {
    // Template was created on Nov 8 and is due on Nov 10: an offset of 2 days.
    fakes.template.createdAt = '2026-11-08T09:00:00.000Z';
    fakes.template.dueDate = '2026-11-10T12:00:00.000Z';

    service.generateDue('2026-11-11');

    const [created] = fakes.savedTasks;
    assert.equal(created.dueDate, '2026-11-13T12:00:00.000Z');
  });

  it('clockChange_doesNotSkipOrRepeatOccurrence', () => {
    // These days cover the end of daylight saving time in Egypt in late October.
    const days = ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];

    days.forEach((day) => {
      assert.equal(service.generateDue(day), 1);
      assert.equal(service.generateDue(day), 0); // running again must not repeat it
    });

    assert.deepEqual(fakes.savedTasks.map((t) => t.occurrenceDate), days);
  });

  it('createRule_savesRuleForExistingTemplateTask', () => {
    const rule = service.createRule({
      templateTaskId: 1, frequency: 'WEEKLY', daysOfWeek: [1, 4],
    });

    assert.equal(rule.templateTaskId, 1);
    assert.equal(rule.frequency, 'WEEKLY');
    assert.deepEqual(rule.daysOfWeek, [1, 4]);
  });
});