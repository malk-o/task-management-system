'use strict';

const crypto = require('node:crypto');
const { hashPassword, verifyPassword } = require('./passwordHasher');
const { UnauthorizedError, ConflictError, TooManyAttemptsError } = require('./authErrors');
const { InvalidRequestError } = require('../errors/errors');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Used when the email is unknown, so "wrong email" and "wrong password" take the same time.
const DUMMY_HASH = hashPassword('not-a-real-password-1');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });

function validatePassword(password) {
  const ok = typeof password === 'string'
    && password.length >= 8 && password.length <= 128
    && /[A-Za-z]/.test(password) && /\d/.test(password);
  if (!ok) {
    throw new InvalidRequestError('Password must be 8 to 128 characters and contain at least one letter and one number');
  }
}

/**
 * Authentication: sign up, sign in, sign out, and checking who a request belongs to.
 * Sessions are random tokens. Only a SHA-256 hash of the token is stored, so a leaked database
 * cannot be used to sign in, and signing out really ends the session.
 */
function createAuthService({ authRepository, userRepository, clock, config = {} }) {
  const sessionMs = (config.sessionHours || 8) * 3600 * 1000;
  const maxFailures = config.maxLoginFailures || 5;
  const lockoutMs = (config.loginLockoutMinutes || 10) * 60 * 1000;
  const failures = new Map(); // email -> { count, firstAt }
  let demoAccounts = [];

  function startSession(user) {
    const token = crypto.randomBytes(32).toString('base64url');
    const now = clock.now();
    const expiresAt = new Date(now.getTime() + sessionMs).toISOString();
    authRepository.deleteExpiredSessions(now.toISOString());
    authRepository.createSession({
      tokenHash: sha256(token), userId: user.id, createdAt: now.toISOString(), expiresAt,
    });
    return { token, expiresAt, user: publicUser(user) };
  }

  function checkLockout(key, nowMs) {
    const entry = failures.get(key);
    if (!entry) return;
    if (nowMs - entry.firstAt >= lockoutMs) {
      failures.delete(key);
      return;
    }
    if (entry.count >= maxFailures) {
      const minutes = Math.max(1, Math.ceil((lockoutMs - (nowMs - entry.firstAt)) / 60000));
      throw new TooManyAttemptsError(`Too many failed sign-in attempts. Try again in ${minutes} minute(s).`);
    }
  }

  function recordFailure(key, nowMs) {
    const entry = failures.get(key);
    if (!entry || nowMs - entry.firstAt >= lockoutMs) {
      failures.set(key, { count: 1, firstAt: nowMs });
    } else {
      entry.count += 1;
    }
    if (failures.size > 1000) { // keep memory bounded
      for (const [k, v] of failures) {
        if (nowMs - v.firstAt >= lockoutMs) failures.delete(k);
      }
    }
  }

  return {
    register({ name, email, password } = {}) {
      const cleanName = String(name ?? '').trim();
      const cleanEmail = normalizeEmail(email);
      if (cleanName.length < 2 || cleanName.length > 80) {
        throw new InvalidRequestError('Name must be between 2 and 80 characters');
      }
      if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > 254) {
        throw new InvalidRequestError('Enter a valid email address');
      }
      validatePassword(password);
      if (authRepository.findUserByEmail(cleanEmail)) {
        throw new ConflictError('An account with this email already exists');
      }

      const user = userRepository.save({ name: cleanName, email: cleanEmail });
      authRepository.saveCredentials(user.id, hashPassword(password));
      return startSession(user);
    },

    login({ email, password } = {}) {
      const key = normalizeEmail(email);
      if (!key || typeof password !== 'string' || password === '') {
        throw new InvalidRequestError('Email and password are required');
      }
      const nowMs = clock.now().getTime();
      checkLockout(key, nowMs);

      const user = authRepository.findUserByEmail(key);
      const storedHash = user ? authRepository.findPasswordHash(user.id) : null;
      const passwordOk = verifyPassword(password, storedHash || DUMMY_HASH);

      if (!user || !storedHash || !passwordOk) {
        recordFailure(key, nowMs);
        throw new UnauthorizedError('Invalid email or password');
      }
      failures.delete(key);
      return startSession(user);
    },

    logout(token) {
      if (token) authRepository.deleteSession(sha256(token));
    },

    /** @returns the user the token belongs to, or null if the token is unknown or expired */
    authenticate(token) {
      if (!token) return null;
      const tokenHash = sha256(token);
      const session = authRepository.findSession(tokenHash);
      if (!session) return null;
      if (session.expiresAt <= clock.now().toISOString()) {
        authRepository.deleteSession(tokenHash);
        return null;
      }
      return authRepository.findUserById(session.userId);
    },

    /** The signed-in user with their role in every project (used by the frontend). */
    me(userId) {
      const user = authRepository.findUserById(userId);
      if (!user) throw new UnauthorizedError('Please sign in to continue.');
      return { ...publicUser(user), memberships: authRepository.findMemberships(userId) };
    },

    /** Demo only: gives every existing user without a password the demo password. */
    ensureDemoCredentials(password) {
      const users = authRepository.findUsersWithoutCredentials();
      users.forEach((user) => authRepository.saveCredentials(user.id, hashPassword(password)));
      demoAccounts = demoAccounts.concat(users.map((u) => ({ name: u.name, email: u.email })));
      return users.length;
    },

    getDemoAccounts() {
      return demoAccounts;
    },
  };
}

module.exports = { createAuthService };
