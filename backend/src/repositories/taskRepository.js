'use strict';

const { Priority, TaskStatus } = require('../domain/enums');

const iso = (value) => {
  if (value === undefined || value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const toTask = (row) => (row
  ? {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.due_date,
    status: row.status,
    projectId: row.project_id,
    assigneeId: row.assignee_id,
    dueSoonNotified: row.due_soon_notified === 1,
    createdAt: row.created_at,
    ruleId: row.rule_id,
    occurrenceDate: row.occurrence_date,
  }
  : null);

/**
 * Shared base repository. Member B owns it (FR2); Member A adds recurrence columns.
 * save() inserts when the task has no id and updates when it has one.
 */
function createTaskRepository(db) {
  function insert(task) {
    const createdAt = iso(task.createdAt) ?? new Date().toISOString();
    const result = db.prepare(
      `INSERT INTO tasks (title, description, priority, due_date, status, project_id,
                          assignee_id, due_soon_notified, created_at, rule_id, occurrence_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      task.title,
      task.description ?? null,
      task.priority ?? Priority.MEDIUM,
      iso(task.dueDate),
      task.status ?? TaskStatus.TODO,
      task.projectId,
      task.assigneeId ?? null,
      task.dueSoonNotified ? 1 : 0,
      createdAt,
      task.ruleId ?? null,
      task.occurrenceDate ?? null,
    );
    return toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(result.lastInsertRowid)));
  }

  function update(task) {
    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, status = ?,
                        project_id = ?, assignee_id = ?, due_soon_notified = ?
       WHERE id = ?`,
    ).run(
      task.title,
      task.description ?? null,
      task.priority,
      iso(task.dueDate),
      task.status,
      task.projectId,
      task.assigneeId ?? null,
      task.dueSoonNotified ? 1 : 0,
      task.id,
    );
    return toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id));
  }

  return {
    save(task) {
      return task.id ? update(task) : insert(task);
    },
    findById(id) {
      return toTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
    },
    findAll() {
      return db.prepare('SELECT * FROM tasks ORDER BY id').all().map(toTask);
    },
    findByRuleAndOccurrenceDate(ruleId, occurrenceDate) {
      return toTask(db.prepare(
        'SELECT * FROM tasks WHERE rule_id = ? AND occurrence_date = ?',
      ).get(ruleId, occurrenceDate));
    },
    /**
     * FR5: tasks due between `from` and `to` (ISO strings), not yet notified,
     * with an assignee, and not in the excluded status (Done).
     */
    findDueSoonCandidates(excludedStatus, from, to) {
      return db.prepare(
        `SELECT * FROM tasks
         WHERE status <> ? AND due_soon_notified = 0 AND assignee_id IS NOT NULL
           AND due_date BETWEEN ? AND ?
         ORDER BY due_date`,
      ).all(excludedStatus, from, to).map(toTask);
    },
  };
}

module.exports = { createTaskRepository };