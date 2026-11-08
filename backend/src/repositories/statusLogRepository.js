'use strict';

const toEntry = (row) => (row
  ? {
    id: row.id,
    taskId: row.task_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
  }
  : null);

/**
 * NFR3 Auditability (Member C). Append-only on purpose: this repository has no update and no delete,
 * and the status_log table has triggers that refuse them as well (see db/schema.js).
 */
function createStatusLogRepository(db) {
  return {
    append({ taskId, oldStatus, newStatus, changedBy, changedAt }) {
      const result = db.prepare(
        `INSERT INTO status_log (task_id, old_status, new_status, changed_by, changed_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(taskId, oldStatus, newStatus, changedBy, changedAt);
      return toEntry(db.prepare('SELECT * FROM status_log WHERE id = ?').get(Number(result.lastInsertRowid)));
    },
    findByTaskId(taskId) {
      return db.prepare('SELECT * FROM status_log WHERE task_id = ? ORDER BY id').all(taskId).map(toEntry);
    },
  };
}

module.exports = { createStatusLogRepository };