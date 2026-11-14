'use strict';

const { TaskStatus } = require('../domain/enums');
const { NotFoundError } = require('../errors/errors');

/**
 * FR3 / US6 (Member C): the project report for managers.
 * Written in a declarative style (filter / map / reduce pipelines) instead of loops with counters.
 */
function createReportService({ taskRepository, userRepository, projectRepository, accessControlService, clock }) {
  const isDone = (task) => task.status === TaskStatus.DONE;
  const isOpen = (task) => !isDone(task);

  function getProjectReport(projectId, userId) {
    if (projectRepository && !projectRepository.findById(projectId)) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }
    accessControlService.requireManager(userId, projectId); // NFR4: managers only

    const tasks = taskRepository.findByProjectId(projectId);
    const now = clock.now().toISOString(); // ISO UTC text sorts like time, so strings compare correctly

    const doneTasks = tasks.filter(isDone).length;
    const completionRate = tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 1000) / 10;

    const overdueTasks = tasks
      .filter(isOpen)
      .filter((task) => task.dueDate && task.dueDate < now)
      .map(({ id, title, dueDate, status, assigneeId }) => ({ id, title, dueDate, status, assigneeId }));

    const openByAssignee = tasks
      .filter(isOpen)
      .filter((task) => task.assigneeId !== null && task.assigneeId !== undefined)
      .reduce((counts, task) => counts.set(task.assigneeId, (counts.get(task.assigneeId) ?? 0) + 1), new Map());

    const workloadPerMember = [...openByAssignee.entries()]
      .map(([assigneeId, openTasks]) => ({
        userId: assigneeId,
        name: userRepository.findById(assigneeId)?.name ?? `User ${assigneeId}`,
        openTasks,
      }))
      .sort((a, b) => b.openTasks - a.openTasks || a.userId - b.userId);

    return { projectId, totalTasks: tasks.length, doneTasks, completionRate, overdueTasks, workloadPerMember };
  }

  return { getProjectReport };
}

module.exports = { createReportService };