'use strict';

const { createAuth } = require('./auth');

const express = require('express');
const { createUserRouter } = require('./controllers/userController');
const { createNotificationRouter } = require('./controllers/notificationController');
const { createTaskRouter } = require('./controllers/taskController');
const { createProjectRouter } = require('./controllers/projectController');
const { createCommentRouter } = require('./controllers/commentController');
const { createRecurrenceRouter } = require('./controllers/recurrenceController');
const { createStatusRouter } = require('./controllers/statusController');
const { createReportRouter } = require('./controllers/reportController');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/** Builds the Express app from a container. No port is opened here, so tests can use it freely. */
function createApp(container) {
  const app = express();
  app.use(express.json());

  // Login module (docs/AUTH.md): everything under /api needs a signed-in user except /api/auth/login and /register.
  const auth = createAuth(container);
  app.use('/api', auth.authenticate);
  app.use('/api/auth', auth.router);
  app.use('/api', auth.requireAuthenticated);

  app.use('/api/users', createUserRouter(container));
  app.use('/api/notifications', createNotificationRouter(container));
  app.use('/api/projects', createProjectRouter(container));
  app.use('/api/tasks', createTaskRouter(container));
  app.use('/api/tasks', createStatusRouter(container));
  app.use('/api/reports', createReportRouter(container));
  app.use('/api/comments', createCommentRouter(container));
  app.use('/api/recurrence-rules', createRecurrenceRouter(container));
  // TODO members: mount your routers here, e.g. app.use('/api/projects', createProjectRouter(container));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };