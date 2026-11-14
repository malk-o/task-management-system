'use strict';

const express = require('express');
const { extractBearerToken } = require('./authMiddleware');

/**
 * POST /api/auth/register   create an account and sign in
 * POST /api/auth/login      sign in
 * POST /api/auth/logout     sign out (ends the session)
 * GET  /api/auth/me         who am I, and my role in each project
 * The controller only handles HTTP; the rules live in authService.
 */
function createAuthRouter({ authService, requireAuthenticated, demoPassword }) {
  const router = express.Router();

  router.post('/register', (req, res) => {
    res.status(201).json(authService.register(req.body || {}));
  });

  router.post('/login', (req, res) => {
    res.json(authService.login(req.body || {}));
  });

  router.post('/logout', requireAuthenticated, (req, res) => {
    authService.logout(extractBearerToken(req));
    res.status(204).end();
  });

  router.get('/me', requireAuthenticated, (req, res) => {
    res.json(authService.me(req.userId));
  });

  // Beta only: lists the seeded demo accounts so the login page can offer quick-fill buttons.
  // It is empty (404) unless the server was started with demo data.
  router.get('/demo-accounts', (req, res) => {
    const accounts = authService.getDemoAccounts();
    if (accounts.length === 0) return res.status(404).json({ message: 'No demo accounts' });
    return res.json({ password: demoPassword, accounts });
  });

  return router;
}

module.exports = { createAuthRouter };
