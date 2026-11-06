'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');
const { InvalidRequestError } = require('../errors/errors');

/**
 * FR5 (Member E). The current user comes from the X-User-Id header (see docs/CONTRACTS.md).
 * A user can only see and update their own notifications. The controller only handles HTTP.
 */
function createNotificationRouter({ notificationService }) {
  const router = express.Router();
  router.use(requireUserId);

  router.get('/', (req, res) => {
    res.json(notificationService.getNotificationsFor(req.userId));
  });

  router.get('/unread-count', (req, res) => {
    res.json({ count: notificationService.countUnread(req.userId) });
  });

  router.patch('/:id/read', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new InvalidRequestError('Notification id must be a number');
    }
    res.json(notificationService.markAsRead(id, req.userId));
  });

  return router;
}

module.exports = { createNotificationRouter };
