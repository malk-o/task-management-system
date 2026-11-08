'use strict';

const events = require('../events/events');
const { NotFoundError, InvalidRequestError } = require('../errors/errors');

/**
 * FR2 + NFR2 (Member B): create a task and assign it to a project member.
 * Status changes live in StatusService (Member C), so the two members do not edit the same file.
 * Rules: only a manager creates and assigns; the assignee must be a member of the task's project;
 * the task is saved first and the taskAssigned event is published after, so listeners can load it.
 */
function createTaskService({
  taskRepository, projectRepository, projectMemberRepository, taskFactory,
  accessControlService, eventPublisher, runInTransaction,
}) {
  function loadProject(projectId) {
    const project = projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }
    return project;
  }

  function requireAssigneeInProject(assigneeId, projectId) {
    if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, assigneeId)) {
      throw new InvalidRequestError('The assignee must be a member of the project');
    }
  }

  const publishAssigned = (task, assigneeId, actingUserId) =>
    eventPublisher.publish(events.taskAssigned(task.id, assigneeId, actingUserId));

  return {
    createTask(actingUserId, {
      projectId, title, description, priority, dueDate, assigneeId,
    } = {}) {
      loadProject(projectId);
      accessControlService.requireManager(actingUserId, projectId);
      if (assigneeId !== undefined && assigneeId !== null) {
        requireAssigneeInProject(assigneeId, projectId);
      }

      const task = runInTransaction(() => taskRepository.save(taskFactory.create({
        projectId, title, description, priority, dueDate, assigneeId,
      })));

      if (task.assigneeId !== null) {
        publishAssigned(task, task.assigneeId, actingUserId);
      }
      return task;
    },

    assignTask(taskId, assigneeId, actingUserId) {
      const task = taskRepository.findById(taskId);
      if (!task) {
        throw new NotFoundError(`Task ${taskId} not found`);
      }
      accessControlService.requireManager(actingUserId, task.projectId);
      requireAssigneeInProject(assigneeId, task.projectId);

      if (task.assigneeId === assigneeId) {
        return task; // already assigned to this person: nothing changes, nobody is notified twice
      }
      const updated = runInTransaction(() => taskRepository.save({ ...task, assigneeId }));
      publishAssigned(updated, assigneeId, actingUserId);
      return updated;
    },

    listProjectTasks(projectId, userId) {
      loadProject(projectId);
      accessControlService.requireMember(userId, projectId);
      return taskRepository.findByProjectId(projectId);
    },
  };
}

module.exports = { createTaskService };