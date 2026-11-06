'use strict';

const toRule = (row) => (row
  ? {
    id: row.id,
    templateTaskId: row.template_task_id,
    frequency: row.frequency,
    daysOfWeek: row.days_of_week ? JSON.parse(row.days_of_week) : null,
    dayOfMonth: row.day_of_month,
    endDate: row.end_date,
    createdAt: row.created_at,
  }
  : null);

/** FR1 (Member A). All SQL for recurrence rules lives here. */
function createRecurrenceRuleRepository(db) {
  return {
    save(rule) {
      const result = db.prepare(
        `INSERT INTO recurrence_rules
           (template_task_id, frequency, days_of_week, day_of_month, end_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        rule.templateTaskId,
        rule.frequency,
        rule.daysOfWeek ? JSON.stringify(rule.daysOfWeek) : null,
        rule.dayOfMonth ?? null,
        rule.endDate ?? null,
        rule.createdAt ?? new Date().toISOString(),
      );
      return this.findById(Number(result.lastInsertRowid));
    },
    findById(id) {
      return toRule(db.prepare('SELECT * FROM recurrence_rules WHERE id = ?').get(id));
    },
    findAll() {
      return db.prepare('SELECT * FROM recurrence_rules ORDER BY id').all().map(toRule);
    },
  };
}

module.exports = { createRecurrenceRuleRepository };