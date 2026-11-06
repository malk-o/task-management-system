'use strict';

const { NotificationType, Role, statusLabel } = require('../domain/enums');
const { EventType } = require('../events/events');
const { NotFoundError } = require('../errors/errors');

/** 2026-11-10T10:00:00.000Z -> "2026-11-10 10:00 UTC" */
const formatDue = (isoDate) => (isoDate ? `${isoDate.slice(0, 16).replace('T', ' ')} UTC` : 'no date');

const toResponse = (n) => ({
  id: n.id,
  taskId: n.taskId,
  type: n.type,
  message: n.message,
  createdAt: n.createdAt,
  read: n.read,
});

/**
 * FR5 (Member E). Observer pattern: this service is the listener. It reacts to domain events
 * and stores one notification per recipient. It never calls the services that publish events.
 */
function createNotificationService({
  notificationRepository,
  taskRepository,
  projectMemberRepository,
  clock,
  runInTransaction = (work) => work(),
}) {
  function findTask(taskId) {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }
    return task;
  }

  function save(recipientId, task, type, message) {
    notificationRepository.save({
      recipientId,
      taskId: task.id,
      type,
      message,
      createdAt: clock.now().toISOString(),
      read: false,
    });
  }

  function notifyAssigned(event) {
    const task = findTask(event.taskId);
    save(event.assigneeId, task, NotificationType.TASK_ASSIGNED,
      `You were assigned to task "${task.title}".`);
  }

  function notifyStatusChanged(event) {
    const task = findTask(event.taskId);
    const message = `Task "${task.title}" moved from ${statusLabel(event.oldStatus)} to ${statusLabel(event.newStatus)}.`;

    // A Set guarantees a person who is both assignee and manager gets only one notification.
    const recipients = new Set();
    if (task.assigneeId) {
      recipients.add(task.assigneeId);
    }
    projectMemberRepository
      .findByProjectIdAndRole(task.projectId, Role.MANAGER)
      .forEach((manager) => recipients.add(manager.userId));

    recipients.forEach((recipientId) => save(recipientId, task, NotificationType.STATUS_CHANGED, message));
  }

  function notifyMention(event) {
    const task = findTask(event.taskId);
    save(event.mentionedUserId, task, NotificationType.MENTION,
      `You were mentioned in a comment on task "${task.title}".`);
  }

  function notifyDueSoon(event) {
    const task = findTask(event.taskId);
    if (!task.assigneeId) {
      return;
    }
    save(task.assigneeId, task, NotificationType.DUE_SOON,
      `Task "${task.title}" is due soon (${formatDue(task.dueDate)}).`);
  }

  const handlers = {
    [EventType.TASK_ASSIGNED]: notifyAssigned,
    [EventType.TASK_STATUS_CHANGED]: notifyStatusChanged,
    [EventType.MENTION_CREATED]: notifyMention,
    [EventType.TASK_DUE_SOON]: notifyDueSoon,
  };

  return {
    /** Observer entry point: called by the event publisher for every event. */
    onEvent(event) {
      const handler = handlers[event.type];
      if (handler) {
        runInTransaction(() => handler(event));
      }
    },

    getNotificationsFor(userId) {
      return notificationRepository.findByRecipientId(userId).map(toResponse);
    },

    countUnread(userId) {
      return notificationRepository.countUnreadByRecipientId(userId);
    },

    markAsRead(notificationId, userId) {
      const notification = notificationRepository.findById(notificationId);
      // A user cannot even learn that someone else's notification exists.
      if (!notification || notification.recipientId !== userId) {
        throw new NotFoundError(`Notification ${notificationId} not found`);
      }
      return toResponse(notificationRepository.save({ ...notification, read: true }));
    },
  };
}

module.exports = { createNotificationService };
