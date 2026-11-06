'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');

/**
 * FR1 (Member A). The controller only handles HTTP: the rules of what a valid recurrence rule
 * is live in RecurrenceService.
 */
function createRecurrenceRouter({ recurrenceService }) {
  const router = express.Router();
  router.use(requireUserId);

  router.get('/', (req, res) => {
    res.json(recurrenceService.listRules());
  });

  router.post('/', (req, res) => {
    res.status(201).json(recurrenceService.createRule(req.body));
  });

  return router;
}

module.exports = { createRecurrenceRouter };