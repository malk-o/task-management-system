'use strict';

/**
 * FR5 (Member E): runs the due-soon check once at start-up and then on a fixed interval.
 * @returns {Function} call it to stop the job
 */
function startDueSoonCheckJob({ dueSoonService, intervalMs, logger = console }) {
  const run = () => {
    try {
      const announced = dueSoonService.notifyDueSoonTasks();
      if (announced > 0) {
        logger.log(`Due-soon check announced ${announced} task(s)`);
      }
    } catch (error) {
      logger.error('Due-soon check failed:', error);
    }
  };

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref(); // do not keep the process alive just for this timer
  return () => clearInterval(timer);
}

module.exports = { startDueSoonCheckJob };
