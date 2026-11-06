'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');

/**
 * FR1 / NFR1 integration tests for recurrence rules.
 * Real repositories on a real in-memory SQLite database.
 */
describe('RecurrenceRuleRepository (integration)', () => {
  let c;
  let project;
  let templateTask;

  beforeEach(() => {
    c = buildTestContainer();
    const data = testData(c);
    project = data.project();
    templateTask = data.task({ project, title: 'Weekly report' });
  });

  it('duplicateRuleAndDate_violatesUniqueConstraint', () => {
    const rule = c.recurrenceRuleRepository.save({
      templateTaskId: templateTask.id,
      frequency: 'DAILY',
    });
    const occurrence = {
      projectId: project.id,
      title: 'Weekly report',
      ruleId: rule.id,
      occurrenceDate: '2026-11-11',
    };

    c.taskRepository.save(occurrence);

    assert.throws(() => c.taskRepository.save(occurrence), /UNIQUE/);
  });
});