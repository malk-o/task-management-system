'use strict';

const { createDatabase } = require('../../src/db/database');
const { buildContainer } = require('../../src/container');

/** A clock the test controls: clock.set(date) moves time. */
function createFakeClock(start = '2026-11-10T10:00:00.000Z') {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    set: (date) => { current = new Date(date); },
  };
}

/** A real container on a fresh in-memory SQLite database, so tests never touch each other's data. */
function buildTestContainer({ start } = {}) {
  const db = createDatabase(':memory:');
  const clock = createFakeClock(start);
  return buildContainer({ db, clock, config: { dueSoonWindowHours: 24, trustUserIdHeader: true } });
}

/** Small helpers that save users, projects, members and tasks in one line. */
function testData(container) {
  const { userRepository, projectRepository, projectMemberRepository, taskRepository, clock } = container;
  return {
    user: (name) => userRepository.save({ name, email: `${name.toLowerCase()}@example.com` }),
    project: (name = 'Demo') => projectRepository.save({ name }),
    member: (project, user, role) => projectMemberRepository.save({ projectId: project.id, userId: user.id, role }),
    inHours: (hours) => new Date(clock.now().getTime() + hours * 3600 * 1000).toISOString(),
    task: ({ project, assignee = null, title = 'A task', dueDate = null, status = 'TODO' }) =>
      taskRepository.save({
        projectId: project.id, assigneeId: assignee ? assignee.id : null, title, dueDate, status,
      }),
  };
}

module.exports = { buildTestContainer, testData, createFakeClock };
