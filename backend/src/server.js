'use strict';

const { loadConfig } = require('./config/config');
const { createDatabase } = require('./db/database');
const { seedDemoData } = require('./db/seed');
const { buildContainer } = require('./container');
const { createApp } = require('./app');
const { startDueSoonCheckJob } = require('./scheduler/dueSoonCheckJob');
const { startRecurrenceJob } = require('./scheduler/recurrenceJob');
const { systemClock } = require('./util/clock');

const config = loadConfig();
const db = createDatabase(config.dbPath);
const container = buildContainer({ db, clock: systemClock, config });

if (config.seedData) {
  seedDemoData({ ...container, clock: systemClock });
}

startDueSoonCheckJob({
  dueSoonService: container.dueSoonService,
  intervalMs: config.dueSoonCheckIntervalMs,
});

startRecurrenceJob({
  recurrenceService: container.recurrenceService,
  clock: systemClock,
  intervalMs: config.recurrenceCheckIntervalMs,
});

createApp(container).listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});