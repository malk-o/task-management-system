'use strict';

const { DailyRecurrenceStrategy } = require('../strategies/dailyRecurrenceStrategy');
const { WeeklyRecurrenceStrategy } = require('../strategies/weeklyRecurrenceStrategy');
const { MonthlyRecurrenceStrategy } = require('../strategies/monthlyRecurrenceStrategy');
const { InvalidRequestError, NotFoundError } = require('../errors/errors');

const STRATEGIES = {
  DAILY: new DailyRecurrenceStrategy(),
  WEEKLY: new WeeklyRecurrenceStrategy(),
  MONTHLY: new MonthlyRecurrenceStrategy(),
};

function dayBefore(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

function toUtcMs(date) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * The new due date keeps the template's offset (whole days between its creation and its due date)
 * and its time of day, counted from the occurrence date.
 */
function dueDateFor(template, occurrenceDate) {
  if (!template.dueDate) return null;
  const createdOn = (template.createdAt ?? template.dueDate).slice(0, 10);
  const dueOn = template.dueDate.slice(0, 10);
  const offsetDays = Math.round((toUtcMs(dueOn) - toUtcMs(createdOn)) / 86400000);
  return addDays(occurrenceDate, offsetDays) + template.dueDate.slice(10);
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

  // endDate is inclusive: an occurrence ON the end date is still created, none after it.
  const hasEnded = (rule, date) => rule.endDate !== null && date > rule.endDate;

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
      dueDate: dueDateFor(template, date),
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
        .filter((rule) => !hasEnded(rule, date))
        .filter((rule) => !alreadyGenerated(rule, date))
        .map((rule) => generateOccurrence(rule, date))
        .length);
    },

    createRule({
      templateTaskId, frequency, daysOfWeek = null, dayOfMonth = null, endDate = null,
    }) {
      if (!STRATEGIES[frequency]) {
        throw new InvalidRequestError('frequency must be DAILY, WEEKLY or MONTHLY');
      }
      if (taskRepository.findById(templateTaskId) === null) {
        throw new NotFoundError('Template task not found');
      }
      return recurrenceRuleRepository.save({
        templateTaskId, frequency, daysOfWeek, dayOfMonth, endDate,
      });
    },

    listRules() {
      return recurrenceRuleRepository.findAll();
    },
  };
}

module.exports = { createRecurrenceService };