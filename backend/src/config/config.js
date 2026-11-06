'use strict';

function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 8080,
    // Beta database: in-memory SQLite (data resets on every restart). Set DB_PATH=tasks.db to keep data.
    dbPath: env.DB_PATH || ':memory:',
    seedData: env.SEED_DATA !== 'false',
    // FR5: due-soon window and how often the scheduler checks
    dueSoonWindowHours: Number(env.DUE_SOON_WINDOW_HOURS) || 24,
    dueSoonCheckIntervalMs: Number(env.DUE_SOON_CHECK_INTERVAL_MS) || 60000,
  };
}

module.exports = { loadConfig };
