'use strict';

const { InvalidRequestError } = require('../errors/errors');

/**
 * Beta authentication: the frontend sends the current user in the X-User-Id header.
 * Member D can replace this with real login later; controllers only read req.userId.
 */
function requireUserId(req, res, next) {
  const raw = req.header('X-User-Id');
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) {
    return next(new InvalidRequestError('Missing or invalid X-User-Id header'));
  }
  req.userId = id;
  return next();
}

module.exports = { requireUserId };
