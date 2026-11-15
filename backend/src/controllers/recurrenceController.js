'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');

/**
 * FR1 (Member A). The controller only handles HTTP: the rules of what a valid recurrence rule
 * is live in RecurrenceService.
 */
function createRecurrenceRouter({
  recurrenceService, clock = { now: () => new Date() },
}) {
  const router = express.Router();
  router.use(requireUserId);

  router.get('/', (req, res) => {
    res.json(recurrenceService.listRules());
  });

  router.post('/', (req, res) => {
    res.status(201).json(recurrenceService.createRule(req.body));
  });

  // Generates today's occurrences now instead of waiting for the scheduler.
  router.post('/run-now', (req, res) => {
    const today = clock.now().toISOString().slice(0, 10);
    const created = recurrenceService.generateDue(today);
    res.json({ date: today, created });
  });

  return router;
}

module.exports = { createRecurrenceRouter };