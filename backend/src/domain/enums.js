'use strict';

const Role = Object.freeze({ MANAGER: 'MANAGER', MEMBER: 'MEMBER' });

const Priority = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' });

const TaskStatus = Object.freeze({
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
});

const STATUS_LABELS = Object.freeze({
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
});

const NotificationType = Object.freeze({
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  MENTION: 'MENTION',
  DUE_SOON: 'DUE_SOON',
});

const statusLabel = (status) => STATUS_LABELS[status] || status;

module.exports = { Role, Priority, TaskStatus, NotificationType, statusLabel };
