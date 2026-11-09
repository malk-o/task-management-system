'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');
const { InvalidRequestError } = require('../errors/errors');

/**
 * FR2 (Member B): projects and their members under /api/projects.
 * The controller only handles HTTP: the rules live in ProjectService and TaskService.
 */
function createProjectRouter({ projectService, taskService }) {
  const router = express.Router();
  router.use(requireUserId);

  const projectId = (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new InvalidRequestError('Project id must be a number');
    }
    return id;
  };

  router.get('/', (req, res) => {
    res.json(projectService.listProjects(req.userId));
  });

  router.post('/', (req, res) => {
    res.status(201).json(projectService.createProject(req.userId, req.body || {}));
  });

  router.get('/:id', (req, res) => {
    res.json(projectService.getProject(projectId(req), req.userId));
  });

  router.post('/:id/members', (req, res) => {
    res.status(201).json(projectService.addMember(projectId(req), req.userId, req.body || {}));
  });

  router.get('/:id/tasks', (req, res) => {
    res.json(taskService.listProjectTasks(projectId(req), req.userId));
  });

  return router;
}

module.exports = { createProjectRouter };