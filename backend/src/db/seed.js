'use strict';

const { Priority, Role } = require('../domain/enums');

/**
 * Demo data so the beta can be shown without sign-up.
 * Users: 1 = Mona (manager), 2 = Sara, 3 = Omar, 4 = Layla (members).
 */
function seedDemoData({ userRepository, projectRepository, projectMemberRepository, taskRepository, clock }) {
  const mona = userRepository.save({ name: 'Mona Manager', email: 'mona@example.com' });
  const sara = userRepository.save({ name: 'Sara Member', email: 'sara@example.com' });
  const omar = userRepository.save({ name: 'Omar Member', email: 'omar@example.com' });
  const layla = userRepository.save({ name: 'Layla Member', email: 'layla@example.com' });

  const project = projectRepository.save({ name: 'GIU Demo Project' });

  projectMemberRepository.save({ projectId: project.id, userId: mona.id, role: Role.MANAGER });
  projectMemberRepository.save({ projectId: project.id, userId: sara.id, role: Role.MEMBER });
  projectMemberRepository.save({ projectId: project.id, userId: omar.id, role: Role.MEMBER });
  projectMemberRepository.save({ projectId: project.id, userId: layla.id, role: Role.MEMBER });

  const inHours = (h) => new Date(clock.now().getTime() + h * 3600 * 1000).toISOString();
  const task = (assignee, title, dueDate, priority) =>
    taskRepository.save({ projectId: project.id, assigneeId: assignee.id, title, dueDate, priority });

  task(sara, 'Prepare sprint demo', inHours(23), Priority.HIGH);
  task(omar, 'Write test plan', inHours(24 * 5), Priority.MEDIUM);
  task(layla, 'Review architecture diagram', inHours(24 * 2), Priority.LOW);
  
  // Member C: extra demo data so the report is not empty (done, in review, overdue)
  const withStatus = (assignee, title, dueDate, priority, status) =>
    taskRepository.save({ projectId: project.id, assigneeId: assignee.id, title, dueDate, priority, status });
  withStatus(sara, 'Set up repository', inHours(-24 * 6), Priority.HIGH, 'DONE');
  withStatus(omar, 'Draft requirements', inHours(-24 * 4), Priority.MEDIUM, 'DONE');
  withStatus(layla, 'Design database schema', inHours(24 * 3), Priority.MEDIUM, 'IN_REVIEW');
  withStatus(omar, 'Fix login bug', inHours(-24 * 2), Priority.HIGH, 'IN_PROGRESS');
}

module.exports = { seedDemoData };
