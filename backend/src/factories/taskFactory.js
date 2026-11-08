'use strict';

const { Priority, TaskStatus } = require('../domain/enums');
const { InvalidRequestError } = require('../errors/errors');

/**
 * FR2, Factory pattern (Member B): the single place that builds a valid task.
 * A new task always starts as To Do, has a trimmed title and a project, and has a valid priority
 * and due date. Task Service (manual creation) and Recurrence Service (generated occurrences) both
 * use it, so the rules for "a valid new task" exist in one place only.
 */
function createTaskFactory() {
  function validTitle(title) {
    const trimmed = typeof title === 'string' ? title.trim() : '';
    if (trimmed === '') {
      throw new InvalidRequestError('A task needs a title');
    }
    return trimmed;
  }

  function validPriority(priority) {
    if (priority === undefined || priority === null) return Priority.MEDIUM;
    if (!Object.values(Priority).includes(priority)) {
      throw new InvalidRequestError('priority must be LOW, MEDIUM or HIGH');
    }
    return priority;
  }

  function validDueDate(dueDate) {
    if (dueDate === undefined || dueDate === null || dueDate === '') return null;
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new InvalidRequestError('dueDate is not a valid date');
    }
    return parsed.toISOString();
  }

  return {
    create({
      projectId, title, description = null, priority, assigneeId = null, dueDate = null,
      ruleId = null, occurrenceDate = null,
    }) {
      if (!Number.isInteger(projectId) || projectId <= 0) {
        throw new InvalidRequestError('A task needs a project');
      }
      return {
        projectId,
        title: validTitle(title),
        description: description ?? null,
        priority: validPriority(priority),
        status: TaskStatus.TODO, // a new task always starts here, whatever the caller asked for
        assigneeId: assigneeId ?? null,
        dueDate: validDueDate(dueDate),
        ruleId,
        occurrenceDate,
      };
    },
  };
}

module.exports = { createTaskFactory };