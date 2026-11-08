'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');
const { InvalidRequestError } = require('../errors/errors');

/**
 * FR3 (Member C): status endpoints under /api/tasks. Mounted next to Member B's task router
 * (both use the /api/tasks prefix) so the two members never edit the same file.
 * The controller only handles HTTP: the rules live in StatusService.
 */
function createStatusRouter({ statusService }) {
  const router = express.Router();
  router.use(requireUserId);

  const taskId = (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new InvalidRequestError('Task id must be a number');
    }
    return id;
  };

  router.get('/', (req, res) => {
    res.json(statusService.listTasks(req.userId));
  });

  router.get('/:id', (req, res) => {
    res.json(statusService.getTask(taskId(req), req.userId));
  });

  router.patch('/:id/status', (req, res) => {
    const status = req.body && req.body.status;
    if (typeof status !== 'string' || status === '') {
      throw new InvalidRequestError('A status is required');
    }
    res.json(statusService.changeStatus(taskId(req), req.userId, status));
  });

  router.get('/:id/status-log', (req, res) => {
    res.json(statusService.getStatusLog(taskId(req), req.userId));
  });

  return router;
}

module.exports = { createStatusRouter };