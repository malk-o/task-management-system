'use strict';

const express = require('express');

/** Base: lists seeded users so the frontend can offer a "log in as" picker during the beta. */
function createUserRouter({ userRepository }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(userRepository.findAll().map((u) => ({ id: u.id, name: u.name })));
  });

  return router;
}

module.exports = { createUserRouter };
