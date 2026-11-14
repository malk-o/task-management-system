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

-- FR3 / NFR3 (Member C): append-only status log. The triggers make the database itself refuse
-- any UPDATE or DELETE, so a log entry can never be edited or removed.
CREATE TABLE IF NOT EXISTS status_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  changed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status_log_task ON status_log (task_id, id);
CREATE TRIGGER IF NOT EXISTS status_log_no_update BEFORE UPDATE ON status_log
BEGIN SELECT RAISE(ABORT, 'status_log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS status_log_no_delete BEFORE DELETE ON status_log
BEGIN SELECT RAISE(ABORT, 'status_log is append-only'); END;

-- FR4 (Member D): comments on tasks and the members mentioned in them
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments (task_id, created_at);

CREATE TABLE IF NOT EXISTS mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES comments(id),
  mentioned_user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE (comment_id, mentioned_user_id)
);
`;

module.exports = { SCHEMA };
