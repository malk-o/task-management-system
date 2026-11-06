'use strict';

/**
 * FR1 / NFR1 (Member A): generates the day's recurring tasks once at start-up and then on a fixed
 * interval. Running it more than once a day is safe: the service creates each occurrence once.
 * @returns {Function} call it to stop the job
 */
function startRecurrenceJob({
  recurrenceService, clock, intervalMs, logger = console,
}) {
  const run = () => {
    try {
      const today = clock.now().toISOString().slice(0, 10);
      const created = recurrenceService.generateDue(today);
      if (created > 0) {
        logger.log(`Recurrence job created ${created} task(s) for ${today}`);
      }
    } catch (error) {
      logger.error('Recurrence job failed:', error);
    }
  };

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref(); // do not keep the process alive just for this timer
  return () => clearInterval(timer);
}

module.exports = { startRecurrenceJob };