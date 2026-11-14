'use strict';

const { createAuthRepository } = require('./authRepository');
const { createAuthService } = require('./authService');
const { createAuthMiddleware } = require('./authMiddleware');
const { createAuthRouter } = require('./authController');

const DEFAULT_DEMO_PASSWORD = 'Demo@12345';

/**
 * Builds the whole login module from the container (once) and returns what app.js needs.
 * Because it creates its own tables and reads users through the container, no existing file
 * of the other members had to change for it.
 */
function createAuth(container) {
  if (container.auth) return container.auth;

  const config = container.config || {};
  const authRepository = createAuthRepository(container.db);
  const authService = createAuthService({
    authRepository,
    userRepository: container.userRepository,
    clock: container.clock,
    config,
  });

  const demoPassword = config.demoPassword || DEFAULT_DEMO_PASSWORD;
  if (config.seedData) {
    authService.ensureDemoCredentials(demoPassword);
  }

  const middleware = createAuthMiddleware({ authService, getConfig: () => container.config || {} });
  const router = createAuthRouter({
    authService, requireAuthenticated: middleware.requireAuthenticated, demoPassword,
  });

  container.authService = authService;
  container.auth = {
    authService,
    router,
    demoPassword,
    authenticate: middleware.authenticate,
    requireAuthenticated: middleware.requireAuthenticated,
  };
  return container.auth;
}

module.exports = { createAuth };
