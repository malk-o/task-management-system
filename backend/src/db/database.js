'use strict';

const { DatabaseSync } = require('node:sqlite');
const { SCHEMA } = require('./schema');

function createDatabase(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/**
 * Returns runInTransaction(work): runs work() so that all its database changes
 * are saved together or not at all. Calling it inside another transaction joins that one.
 */
function createTransactionRunner(db) {
  let depth = 0;
  return function runInTransaction(work) {
    if (depth > 0) {
      return work();
    }
    db.exec('BEGIN');
    depth += 1;
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      depth -= 1;
    }
  };
}

module.exports = { createDatabase, createTransactionRunner };
