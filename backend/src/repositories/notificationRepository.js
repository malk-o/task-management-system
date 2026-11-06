'use strict';

const toNotification = (row) => (row
  ? {
    id: row.id,
    recipientId: row.recipient_id,
    taskId: row.task_id,
    type: row.type,
    message: row.message,
    createdAt: row.created_at,
    read: row.is_read === 1,
  }
  : null);

/** FR5 (Member E). save() inserts a new notification, or updates the read flag of an existing one. */
function createNotificationRepository(db) {
  return {
    save(notification) {
      if (notification.id) {
        db.prepare('UPDATE notifications SET is_read = ? WHERE id = ?')
          .run(notification.read ? 1 : 0, notification.id);
        return this.findById(notification.id);
      }
      const result = db.prepare(
        `INSERT INTO notifications (recipient_id, task_id, type, message, created_at, is_read)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        notification.recipientId,
        notification.taskId ?? null,
        notification.type,
        notification.message,
        notification.createdAt,
        notification.read ? 1 : 0,
      );
      return this.findById(Number(result.lastInsertRowid));
    },
    findById(id) {
      return toNotification(db.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
    },
    findByRecipientId(recipientId) {
      return db.prepare(
        'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC, id DESC',
      ).all(recipientId).map(toNotification);
    },
    countUnreadByRecipientId(recipientId) {
      const row = db.prepare(
        'SELECT COUNT(*) AS n FROM notifications WHERE recipient_id = ? AND is_read = 0',
      ).get(recipientId);
      return Number(row.n);
    },
  };
}

module.exports = { createNotificationRepository };
