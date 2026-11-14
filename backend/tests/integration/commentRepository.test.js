'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase, createTransactionRunner } = require('../../src/db/database');
const { createCommentRepository } = require('../../src/repositories/commentRepository');

/** FR4 (Member D): the comment repository on a real in-memory SQLite database with the real schema. */
describe('CommentRepository (integration)', () => {
  let db;
  let repo;
  let runInTransaction;

  beforeEach(() => {
    db = createDatabase(':memory:');
    runInTransaction = createTransactionRunner(db);
    repo = createCommentRepository(db);
    db.exec(`
      INSERT INTO users (id, name) VALUES (1, 'Mona Manager'), (2, 'Sara Member'), (3, 'Omar Member');
      INSERT INTO projects (id, name) VALUES (1, 'Demo');
      INSERT INTO tasks (id, title, project_id, created_at) VALUES
        (10, 'Prepare sprint demo', 1, '2026-11-10T09:00:00.000Z'),
        (11, 'Write report', 1, '2026-11-10T09:00:00.000Z');
    `);
  });

  const save = (taskId, authorId, body, createdAt, mentionedUserIds = []) =>
    runInTransaction(() => repo.saveWithMentions({ taskId, authorId, body, createdAt }, mentionedUserIds));

  it('findByTask_returnsCommentsOldestFirst', () => {
    // saved out of order on purpose
    save(10, 1, 'second', '2026-11-10T10:05:00.000Z');
    save(10, 2, 'first', '2026-11-10T10:00:00.000Z');
    save(10, 3, 'third', '2026-11-10T10:09:00.000Z');

    assert.deepEqual(repo.findByTask(10).map((c) => c.body), ['first', 'second', 'third']);
  });

  it('findByTask_onlyReturnsThatTasksComments', () => {
    save(10, 1, 'on task 10', '2026-11-10T10:00:00.000Z');
    save(11, 1, 'on task 11', '2026-11-10T10:00:00.000Z');

    assert.deepEqual(repo.findByTask(11).map((c) => c.body), ['on task 11']);
  });

  it('saveWithMentions_storesMentionRows', () => {
    const comment = save(10, 1, '@Sara @Omar look', '2026-11-10T10:00:00.000Z', [2, 3]);
    assert.deepEqual(repo.findMentionedUserIds(comment.id), [2, 3]);
  });

  it('failedMention_rollsBackTheWholeComment', () => {
    // the same user twice breaks UNIQUE(comment_id, mentioned_user_id)
    assert.throws(() => save(10, 1, 'oops', '2026-11-10T10:00:00.000Z', [2, 2]));
    assert.equal(repo.findByTask(10).length, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM mentions').get().n, 0);
  });

  it('emptyBody_isRefusedByTheDatabase', () => {
    assert.throws(() => save(10, 1, '   ', '2026-11-10T10:00:00.000Z'));
  });
});
