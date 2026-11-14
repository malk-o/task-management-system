'use strict';

const { AppError } = require('../errors/errors');

/** 401: not signed in, wrong credentials, or the session expired. */
class UnauthorizedError extends AppError {
  constructor(message = 'Please sign in to continue.') { super(message, 401); }
}

/** 409: e.g. an account with this email already exists. */
class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}

/** 429: too many failed sign-in attempts. */
class TooManyAttemptsError extends AppError {
  constructor(message) { super(message, 429); }
}

module.exports = { UnauthorizedError, ConflictError, TooManyAttemptsError };
