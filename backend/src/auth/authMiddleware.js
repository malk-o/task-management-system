'use strict';

const { UnauthorizedError } = require('./authErrors');

function extractBearerToken(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.header('Authorization') || '');
  return match ? match[1].trim() : null;
}

/**
 * authenticate: finds out who the request belongs to and sets req.userId.
 * requireAuthenticated: rejects the request with 401 if nobody is signed in.
 *
 * The user comes ONLY from a valid session token. The old X-User-Id header is ignored unless the
 * app is started with config.trustUserIdHeader = true, which only the automated tests do.
 */
function createAuthMiddleware({ authService, getConfig }) {
  function authenticate(req, res, next) {
    const token = extractBearerToken(req);
    if (token) {
      const user = authService.authenticate(token);
      if (!user) {
        return next(new UnauthorizedError('Your session has expired. Please sign in again.'));
      }
      req.userId = user.id;
      req.user = user;
    } else if (getConfig().trustUserIdHeader === true) {
      const id = Number(req.header('X-User-Id'));
      if (Number.isInteger(id) && id > 0) req.userId = id;
    }
    return next();
  }

  function requireAuthenticated(req, res, next) {
    if (!req.userId) return next(new UnauthorizedError('Please sign in to continue.'));
    return next();
  }

  return { authenticate, requireAuthenticated };
}

module.exports = { createAuthMiddleware, extractBearerToken };
