'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');
const { InvalidRequestError } = require('../errors/errors');

/**
 * FR4 (Member D): comment endpoints, mounted at /api/comments.
 *   GET  /api/comments?taskId=10           -> the task's comments, oldest first
 *   POST /api/comments { taskId, body }    -> add a comment (with @mentions)
 * The controller only handles HTTP: the rules and the NFR4 check live in CommentService.
 */
function createCommentRouter({ commentService }) {
  const router = express.Router();
  router.use(requireUserId);

  const toTaskId = (value) => {
    const id = Number(value);
    if (value === undefined || value === null || value === '' || !Number.isInteger(id) || id <= 0) {
      throw new InvalidRequestError('taskId must be a number');
    }
    return id;
  };

  router.get('/', (req, res) => {
    res.json(commentService.listComments(toTaskId(req.query.taskId), req.userId));
  });

  router.post('/', (req, res) => {
    const { taskId, body } = req.body || {};
    res.status(201).json(commentService.addComment(toTaskId(taskId), req.userId, body));
  });

  return router;
}

module.exports = { createCommentRouter };
