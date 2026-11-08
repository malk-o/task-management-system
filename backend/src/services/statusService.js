'use strict';

const events = require('../events/events');
const { NotFoundError, InvalidRequestError } = require('../errors/errors');
const { stateFor, allowedTransitions } = require('../states/taskState');
const { statusLabel } = require('../domain/enums');

/**
 * FR3 + NFR3 (Member C). The status workflow of a task.
 * Split out of taskService (as the TODO there suggests) so Members B and C do not edit the same file.
 */
function createStatusService({
  taskRepository, statusLogRepository, eventPublisher, accessControlService, runInTransaction, clock,
}) {
  function loadTask(taskId) {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }
    return task;
  }

  /** A task as the API returns it: the stored fields plus the statuses it may move to. */
  const present = (task) => ({ ...task, allowedTransitions: allowedTransitions(task.status) });

  function changeStatus(taskId, userId, newStatus) {
    const task = loadTask(taskId);
    accessControlService.requireMember(userId, task.projectId);

    const target = stateFor(newStatus); // unknown status -> 400
    const current = stateFor(task.status);
    if (!current.canMoveTo(target.status)) {
      throw new InvalidRequestError(
        `A task cannot move from ${statusLabel(current.status)} to ${statusLabel(target.status)}`,
      );
    }

    const updated = runInTransaction(() => {
      const saved = taskRepository.save({ ...task, status: target.status });
      statusLogRepository.append({
        taskId,
        oldStatus: current.status,
        newStatus: target.status,
        changedBy: userId,
        changedAt: clock.now().toISOString(),
      });
      return saved;
    });

    eventPublisher.publish(events.taskStatusChanged(taskId, current.status, target.status, userId));
    return present(updated);
  }

    /** The audit trail of one task, oldest entry first. */
  function getStatusLog(taskId, userId) {
    const task = loadTask(taskId);
    accessControlService.requireMember(userId, task.projectId);
    return statusLogRepository.findByTaskId(taskId);
  }

  function getTask(taskId, userId) {
    const task = loadTask(taskId);
    accessControlService.requireMember(userId, task.projectId);
    return present(task);
  }

  function listTasks(userId) { // eslint-disable-line no-unused-vars
    return taskRepository.findAll().map(present);
  }

  return { changeStatus, getStatusLog, getTask, listTasks };
}

module.exports = { createStatusService };