'use strict';

const { loadConfig } = require('./config/config');
const { createDatabase } = require('./db/database');
const { seedDemoData } = require('./db/seed');
const { buildContainer } = require('./container');
const { createApp } = require('./app');
const { startDueSoonCheckJob } = require('./scheduler/dueSoonCheckJob');
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

createApp(container).listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
