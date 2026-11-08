'use strict';

const express = require('express');
const { requireUserId } = require('../middleware/currentUser');
const { InvalidRequestError } = require('../errors/errors');

/** FR3 / US6 (Member C): GET /api/reports/:projectId. Managers only (checked in ReportService). */
function createReportRouter({ reportService }) {
  const router = express.Router();
  router.use(requireUserId);

  router.get('/:projectId', (req, res) => {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new InvalidRequestError('Project id must be a number');
    }
    res.json(reportService.getProjectReport(projectId, req.userId));
  });

  return router;
}

module.exports = { createReportRouter };