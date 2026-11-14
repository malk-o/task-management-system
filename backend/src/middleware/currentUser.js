'use strict';

const { UnauthorizedError } = require('../auth/authErrors');

/**
 * Kept under the same name so every router that does `router.use(requireUserId)` keeps working.
 * The user is now identified by a verified login session (see docs/AUTH.md), not by a header the
 * client could fake. req.userId is set by the authentication middleware in src/auth/.
 */
function requireUserId(req, res, next) {
  if (!req.userId) {
    return next(new UnauthorizedError('Please sign in to continue.'));
  }
  return next();
}

module.exports = { requireUserId };
