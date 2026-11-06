
'use strict';

const { createTransactionRunner } = require('./db/database');
const { createUserRepository } = require('./repositories/userRepository');
const { createProjectRepository } = require('./repositories/projectRepository');
const { createProjectMemberRepository } = require('./repositories/projectMemberRepository');
const { createTaskRepository } = require('./repositories/taskRepository');
const { createNotificationRepository } = require('./repositories/notificationRepository');
const { createRecurrenceRuleRepository } = require('./repositories/recurrenceRuleRepository');
const { SynchronousEventPublisher } = require('./events/eventPublisher');
const { createNotificationService } = require('./services/notificationService');
const { createDueSoonService } = require('./services/dueSoonService');
const { createAccessControlService } = require('./security/accessControlService');
const { createTaskFactory } = require('./factories/taskFactory');
const { createTaskService } = require('./services/taskService');
const { createRecurrenceService } = require('./services/recurrenceService');
const { createCommentService } = require('./services/commentService');

/**
 * Composition root: the ONE place where objects are created and connected.
 * Services receive their dependencies as arguments (Dependency Inversion), so tests can pass fakes.
 * Add your own repositories and services here and return them.
 */
function buildContainer({ db, clock, config }) {
  const runInTransaction = createTransactionRunner(db);

  // repositories (data access)
  const userRepository = createUserRepository(db);
  const projectRepository = createProjectRepository(db);
  const projectMemberRepository = createProjectMemberRepository(db);
  const taskRepository = createTaskRepository(db);
  const notificationRepository = createNotificationRepository(db);
  const recurrenceRuleRepository = createRecurrenceRuleRepository(db);

  // Observer: publisher + listeners
  const eventPublisher = new SynchronousEventPublisher();

  // services
  const accessControlService = createAccessControlService({ projectMemberRepository });
  const notificationService = createNotificationService({
    notificationRepository, taskRepository, projectMemberRepository, clock, runInTransaction,
  });
  eventPublisher.subscribe(notificationService);

  const dueSoonService = createDueSoonService({
    taskRepository,
    eventPublisher,
    clock,
    windowHours: config.dueSoonWindowHours,
    runInTransaction,
  });

  // TODO members A-D: these are empty for now; fill them in (see docs/MEMBER_TODO.md)
  const taskFactory = createTaskFactory();
  const taskService = createTaskService({ taskRepository, eventPublisher, runInTransaction });
  const recurrenceService = createRecurrenceService({
  recurrenceRuleRepository, taskRepository, taskFactory, runInTransaction,
});
  const commentService = createCommentService({ eventPublisher, projectMemberRepository, runInTransaction });

  return {
    db,
    clock,
    config,
    runInTransaction,
    userRepository,
    projectRepository,
    projectMemberRepository,
    taskRepository,
    notificationRepository,
    recurrenceRuleRepository,
    eventPublisher,
    accessControlService,
    notificationService,
    dueSoonService,
    taskFactory,
    taskService,
    recurrenceService,
    commentService,
  };
}

module.exports = { buildContainer };
