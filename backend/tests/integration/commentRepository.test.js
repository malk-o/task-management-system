const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { createCommentRepository } = require('../../src/repositories/commentRepository');

// Real in-memory SQLite database.
// If db/schema.js already exports a function that creates every table, call that here instead
// (the same way the other integration tests do) and remove the CREATE TABLE lines below.
function setupDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL);
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      author_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL CHECK (length(trim(body)) > 0),
      created_at TEXT NOT NULL
    );
    CREATE TABLE mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL REFERENCES comments(id),
      mentioned_user_id INTEGER NOT NULL REFERENCES users(id),
      UNIQUE (comment_id, mentioned_user_id)
    );
    INSERT INTO users (id, name) VALUES (1, 'Mona Manager'), (2, 'Sara Member'), (3, 'Omar Member');
    INSERT INTO tasks (id, title) VALUES (10, 'Prepare sprint demo'), (11, 'Write report');
  `);
  return db;
}

describe('CommentRepository (integration)', () => {
  let db;
  let repo;
  beforeEach(() => {
    db = setupDb();
    repo = createCommentRepository(db);
  });

  test('findByTask_returnsCommentsOldestFirst', () => {
    // saved out of order on purpose
    repo.saveWithMentions({ taskId: 10, authorId: 1, body: 'second', createdAt: '2026-11-07T10:05:00.000Z' }, []);
    repo.saveWithMentions({ taskId: 10, authorId: 2, body: 'first', createdAt: '2026-11-07T10:00:00.000Z' }, []);
    repo.saveWithMentions({ taskId: 10, authorId: 3, body: 'third', createdAt: '2026-11-07T10:09:00.000Z' }, []);

    assert.deepEqual(repo.findByTask(10).map((c) => c.body), ['first', 'second', 'third']);
  });

  test('findByTask_onlyReturnsThatTasksComments', () => {
    repo.saveWithMentions({ taskId: 10, authorId: 1, body: 'on task 10', createdAt: '2026-11-07T10:00:00.000Z' }, []);
    repo.saveWithMentions({ taskId: 11, authorId: 1, body: 'on task 11', createdAt: '2026-11-07T10:00:00.000Z' }, []);

    assert.deepEqual(repo.findByTask(11).map((c) => c.body), ['on task 11']);
  });

  test('saveWithMentions_storesMentionRows', () => {
    const comment = repo.saveWithMentions(
      { taskId: 10, authorId: 1, body: '@Sara @Omar look', createdAt: '2026-11-07T10:00:00.000Z' }, [2, 3]
    );
    assert.deepEqual(repo.findMentionedUserIds(comment.id), [2, 3]);
  });

  test('failedMention_rollsBackTheWholeComment', () => {
    // the same user twice breaks UNIQUE(comment_id, mentioned_user_id)
    assert.throws(() =>
      repo.saveWithMentions({ taskId: 10, authorId: 1, body: 'oops', createdAt: '2026-11-07T10:00:00.000Z' }, [2, 2])
    );
    assert.equal(repo.findByTask(10).length, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM mentions').get().n, 0);
  });
});
