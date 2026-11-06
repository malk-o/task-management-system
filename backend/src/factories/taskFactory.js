'use strict';

/**
 * TODO Member B (FR2, Factory pattern): the single place that builds a valid task
 * (default status TODO, required title and project). Member A's recurrence service also uses it.
 */
function createTaskFactory() {
  return {};
}

module.exports = { createTaskFactory };
