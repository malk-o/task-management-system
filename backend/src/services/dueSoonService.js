'use strict';

const { TaskStatus } = require('../domain/enums');
const { taskDueSoon } = require('../events/events');

/**
 * FR5 (Member E): finds tasks due within the next 24 hours and publishes one event per task.
 * The dueSoonNotified flag guarantees a task is announced only once, even if the check runs again.
 */
function createDueSoonService({
  taskRepository,
  eventPublisher,
  clock,
  windowHours = 24,
  runInTransaction = (work) => work(),
}) {
  return {
    /** @returns {number} how many tasks were announced in this run */
    notifyDueSoonTasks() {
      return runInTransaction(() => {
        const now = clock.now();
        const limit = new Date(now.getTime() + windowHours * 3600 * 1000);
        const candidates = taskRepository.findDueSoonCandidates(
          TaskStatus.DONE, now.toISOString(), limit.toISOString(),
        );

        for (const task of candidates) {
          eventPublisher.publish(taskDueSoon(task.id));
          taskRepository.save({ ...task, dueSoonNotified: true });
        }
        return candidates.length;
      });
    },
  };
}

module.exports = { createDueSoonService };
