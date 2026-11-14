'use strict';

/**
 * FR4 (Member D). All comment SQL lives here (services never write SQL).
 * Tables (see db/schema.js):
 *   comments(id, task_id, author_id, body, created_at)
 *   mentions(id, comment_id, mentioned_user_id), UNIQUE (comment_id, mentioned_user_id)
 */
function createCommentRepository(db) {
  const toComment = (row) => ({
    id: Number(row.id),
    taskId: Number(row.task_id),
    authorId: Number(row.author_id),
    body: row.body,
    createdAt: row.created_at,
  });

  return {
    /**
     * Saves a comment and its mentions. Call it inside runInTransaction(...) so the comment
     * and its mentions are saved together or not at all.
     */
    saveWithMentions({ taskId, authorId, body, createdAt }, mentionedUserIds) {
      const result = db.prepare('INSERT INTO comments (task_id, author_id, body, created_at) VALUES (?, ?, ?, ?)')
        .run(taskId, authorId, body, createdAt);
      const commentId = Number(result.lastInsertRowid);
      const insertMention = db.prepare('INSERT INTO mentions (comment_id, mentioned_user_id) VALUES (?, ?)');
      mentionedUserIds.forEach((userId) => insertMention.run(commentId, userId));
      return { id: commentId, taskId, authorId, body, createdAt };
    },

    /** Oldest first, so the discussion reads top to bottom. */
    findByTask(taskId) {
      return db.prepare(
        'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC, id ASC',
      ).all(taskId).map(toComment);
    },

    findMentionedUserIds(commentId) {
      return db.prepare('SELECT mentioned_user_id FROM mentions WHERE comment_id = ? ORDER BY id')
        .all(commentId).map((row) => Number(row.mentioned_user_id));
    },
  };
}

module.exports = { createCommentRepository };
