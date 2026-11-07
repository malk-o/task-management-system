// All comment SQL lives here (services never write SQL).
// Tables (see db/schema.js):
//   comments(id, task_id, author_id, body, created_at)
//   mentions(id, comment_id, mentioned_user_id)
function createCommentRepository(db) {
  const insertComment = db.prepare(
    'INSERT INTO comments (task_id, author_id, body, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertMention = db.prepare(
    'INSERT INTO mentions (comment_id, mentioned_user_id) VALUES (?, ?)'
  );
  const selectByTask = db.prepare(
    'SELECT id, task_id, author_id, body, created_at FROM comments WHERE task_id = ? ORDER BY created_at ASC, id ASC'
  );
  const selectMentions = db.prepare(
    'SELECT mentioned_user_id FROM mentions WHERE comment_id = ? ORDER BY id ASC'
  );

  function toComment(row) {
    return {
      id: Number(row.id),
      taskId: Number(row.task_id),
      authorId: Number(row.author_id),
      body: row.body,
      createdAt: row.created_at,
    };
  }

  // Saves the comment and its mentions together: either both are saved or neither.
  function saveWithMentions({ taskId, authorId, body, createdAt }, mentionedUserIds) {
    db.exec('BEGIN');
    try {
      const result = insertComment.run(taskId, authorId, body, createdAt);
      const commentId = Number(result.lastInsertRowid);
      for (const userId of mentionedUserIds) {
        insertMention.run(commentId, userId);
      }
      db.exec('COMMIT');
      return { id: commentId, taskId, authorId, body, createdAt };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  // Oldest first, so the discussion reads top to bottom.
  function findByTask(taskId) {
    return selectByTask.all(taskId).map(toComment);
  }

  function findMentionedUserIds(commentId) {
    return selectMentions.all(commentId).map((row) => Number(row.mentioned_user_id));
  }

  return { saveWithMentions, findByTask, findMentionedUserIds };
}

module.exports = { createCommentRepository };
