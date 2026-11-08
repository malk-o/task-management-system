'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');
const { InvalidRequestError } = require('../errors/errors');

/**
 * FR2 (Member B): POST /api/tasks (create) and PATCH /api/tasks/:id/assignee (assign).
 * Mounted under /api/tasks next to Member C's status router (which owns GET and the status routes).
 * The controller only handles HTTP: the rules live in TaskService.
 */
function createTaskRouter({ taskService }) {
  const router = express.Router();
  router.use(requireUserId);

  router.post('/', (req, res) => {
    res.status(201).json(taskService.createTask(req.userId, req.body || {}));
  });

  router.patch('/:id/assignee', (req, res) => {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      throw new InvalidRequestError('Task id must be a number');
    }
    const assigneeId = req.body && req.body.assigneeId;
    if (!Number.isInteger(assigneeId)) {
      throw new InvalidRequestError('assigneeId is required');
    }
    res.json(taskService.assignTask(taskId, assigneeId, req.userId));
  });

  return router;
}

module.exports = { createTaskRouter };