'use strict';

/** Base class: every error that should become a clean JSON response extends this. */
class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class NotFoundError extends AppError {
  constructor(message) { super(message, 404); }
}

/** Rejected input, e.g. a task without a title or assigning to a non-member. */
class InvalidRequestError extends AppError {
  constructor(message) { super(message, 400); }
}

/** The user is not allowed to do this (NFR4). */
class ForbiddenError extends AppError {
  constructor(message) { super(message, 403); }
}

module.exports = { AppError, NotFoundError, InvalidRequestError, ForbiddenError };
