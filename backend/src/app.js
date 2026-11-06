'use strict';

const express = require('express');
const { createUserRouter } = require('./controllers/userController');
const { createNotificationRouter } = require('./controllers/notificationController');
const { createTaskRouter } = require('./controllers/taskController');
const { createCommentRouter } = require('./controllers/commentController');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/** Builds the Express app from a container. No port is opened here, so tests can use it freely. */
function createApp(container) {
  const app = express();
  app.use(express.json());

  app.use('/api/users', createUserRouter(container));
  app.use('/api/notifications', createNotificationRouter(container));
  app.use('/api/tasks', createTaskRouter(container));
  app.use('/api/comments', createCommentRouter(container));
  // TODO members: mount your routers here, e.g. app.use('/api/projects', createProjectRouter(container));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
