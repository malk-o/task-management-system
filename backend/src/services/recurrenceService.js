'use strict';

const { DailyRecurrenceStrategy } = require('../strategies/dailyRecurrenceStrategy');
const { WeeklyRecurrenceStrategy } = require('../strategies/weeklyRecurrenceStrategy');
const { MonthlyRecurrenceStrategy } = require('../strategies/monthlyRecurrenceStrategy');

const STRATEGIES = {
  DAILY: new DailyRecurrenceStrategy(),
  WEEKLY: new WeeklyRecurrenceStrategy(),
  MONTHLY: new MonthlyRecurrenceStrategy(),
};

function dayBefore(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/**
 * FR1 / NFR1 (Member A): creates the occurrences that fall on a given date,
 * exactly once per (rule, date).
 */
function createRecurrenceService({
  recurrenceRuleRepository, taskRepository, taskFactory, runInTransaction,
}) {
  // A rule is due on `date` when its strategy's next occurrence after the previous day is `date`.
  const isDueOn = (rule, date) => STRATEGIES[rule.frequency].next(dayBefore(date), rule) === date;

  const alreadyGenerated = (rule, date) =>
    taskRepository.findByRuleAndOccurrenceDate(rule.id, date) !== null;

  function generateOccurrence(rule, date) {
    const template = taskRepository.findById(rule.templateTaskId);
    const task = taskFactory.create({
      projectId: template.projectId,
      title: template.title,
      description: template.description,
      priority: template.priority,
      assigneeId: template.assigneeId,
      ruleId: rule.id,
      occurrenceDate: date,
    });
    return taskRepository.save(task);
  }

  return {
    /** Returns how many tasks were created. */
    generateDue(date) {
      return runInTransaction(() => recurrenceRuleRepository.findAll()
        .filter((rule) => isDueOn(rule, date))
        .filter((rule) => !alreadyGenerated(rule, date))
        .map((rule) => generateOccurrence(rule, date))
        .length);
    },
  };
}

module.exports = { createRecurrenceService };