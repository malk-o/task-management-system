'use strict';

const { Role } = require('../domain/enums');
const { NotFoundError, InvalidRequestError } = require('../errors/errors');

/**
 * FR2 (Member B): create a project and add members to it.
 * The creator becomes the project's manager; only a manager adds members.
 */
function createProjectService({
  projectRepository, projectMemberRepository, userRepository, accessControlService, runInTransaction,
}) {
  function loadProject(projectId) {
    const project = projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }
    return project;
  }

  return {
    createProject(userId, { name } = {}) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (trimmed === '') {
        throw new InvalidRequestError('A project needs a name');
      }
      if (!userRepository.findById(userId)) {
        throw new NotFoundError(`User ${userId} not found`);
      }
      // the project and its first manager are saved together or not at all
      return runInTransaction(() => {
        const project = projectRepository.save({ name: trimmed });
        projectMemberRepository.save({ projectId: project.id, userId, role: Role.MANAGER });
        return project;
      });
    },

    addMember(projectId, actingUserId, { userId, role = Role.MEMBER } = {}) {
      loadProject(projectId);
      accessControlService.requireManager(actingUserId, projectId);
      if (!Object.values(Role).includes(role)) {
        throw new InvalidRequestError('role must be MANAGER or MEMBER');
      }
      if (!userRepository.findById(userId)) {
        throw new NotFoundError(`User ${userId} not found`);
      }
      if (projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
        throw new InvalidRequestError('That user is already a member of the project');
      }
      return projectMemberRepository.save({ projectId, userId, role });
    },

    listProjects(userId) {
      return projectRepository.findByMemberUserId(userId);
    },

    getProject(projectId, userId) {
      const project = loadProject(projectId);
      accessControlService.requireMember(userId, projectId);
      const members = projectMemberRepository.findByProjectId(projectId).map((m) => ({
        userId: m.userId,
        name: userRepository.findById(m.userId)?.name ?? `User ${m.userId}`,
        role: m.role,
      }));
      return { ...project, members };
    },
  };
}

module.exports = { createProjectService };