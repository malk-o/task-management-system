'use strict';

/**
 * TODO Member B (FR2) and Member C (FR3).
 *
 * Member B: createTask(...) and assignTask(taskId, assigneeId, actingUserId). After assigning, call
 *   eventPublisher.publish(events.taskAssigned(taskId, assigneeId, actingUserId));
 * Member C: changeStatus(taskId, userId, newStatus) using the State pattern, write the status log, then
 *   eventPublisher.publish(events.taskStatusChanged(taskId, oldStatus, newStatus, userId));
 * where `events` is require('../events/events'). If this file grows, split it (e.g. a statusService).
 */
function createTaskService({ taskRepository, eventPublisher, runInTransaction }) { // eslint-disable-line no-unused-vars
  return {};
}

module.exports = { createTaskService };
