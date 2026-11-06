'use strict';

/**
 * Domain events. A publisher creates one of these and hands it to eventPublisher.publish(...);
 * it never calls the Notification Service directly (Observer pattern, owned by Member E).
 */
const EventType = Object.freeze({
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
  MENTION_CREATED: 'MENTION_CREATED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
});

/** Published by Task Service (Member B) after a task is assigned. */
const taskAssigned = (taskId, assigneeId, assignedByUserId) => ({
  type: EventType.TASK_ASSIGNED, taskId, assigneeId, assignedByUserId, occurredAt: new Date(),
});

/** Published by Task Service (Member C) after a valid status transition. */
const taskStatusChanged = (taskId, oldStatus, newStatus, changedByUserId) => ({
  type: EventType.TASK_STATUS_CHANGED, taskId, oldStatus, newStatus, changedByUserId, occurredAt: new Date(),
});

/** Published by Comment Service (Member D) once for each valid @mention. */
const mentionCreated = (taskId, mentionedUserId, mentionedByUserId) => ({
  type: EventType.MENTION_CREATED, taskId, mentionedUserId, mentionedByUserId, occurredAt: new Date(),
});

/** Published by Due Soon Service (Member E) when a task is due within 24 hours. */
const taskDueSoon = (taskId) => ({
  type: EventType.TASK_DUE_SOON, taskId, occurredAt: new Date(),
});

module.exports = { EventType, taskAssigned, taskStatusChanged, mentionCreated, taskDueSoon };
