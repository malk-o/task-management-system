'use strict';

/**
 * Tables for the beta (SQLite). Dates are stored as ISO-8601 UTC text, e.g. 2026-11-10T10:00:00.000Z,
 * which sorts correctly as text. Each member adds their own tables in their marked section.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'Africa/Cairo'
);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('MANAGER', 'MEMBER')),
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'TODO',
  project_id INTEGER NOT NULL REFERENCES projects(id),
  assignee_id INTEGER REFERENCES users(id),
  due_soon_notified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
  rule_id INTEGER REFERENCES recurrence_rules(id),
  occurrence_date TEXT,
  UNIQUE (rule_id, occurrence_date)
);

-- FR5 (Member E)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  task_id INTEGER REFERENCES tasks(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, created_at);

-- TODO Member A: recurrence_rules table
-- FR1 / NFR1 (Member A)
CREATE TABLE IF NOT EXISTS recurrence_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_task_id INTEGER NOT NULL REFERENCES tasks(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  days_of_week TEXT,
  day_of_month INTEGER,
  end_date TEXT,
  created_at TEXT NOT NULL
);
-- TODO Member C: status_log table (append-only, NFR3)
-- TODO Member D: comments and mentions tables
`;

module.exports = { SCHEMA };
