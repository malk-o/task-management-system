'use strict';

const { ForbiddenError } = require('../errors/errors');
const { Role } = require('../domain/enums');

/**
 * NFR4 (Member D). The one place that decides who may do what.
 * The services of every member call it before they read or change project data:
 *   requireMember(userId, projectId)  -> only members of the project may see or change its tasks and comments
 *   requireManager(userId, projectId) -> only the project's managers may create/assign tasks, add members, see reports
 * When a check fails it throws ForbiddenError, which the error middleware turns into 403.
 */
function createAccessControlService({ projectMemberRepository }) {
  function requireMember(userId, projectId) {
    const membership = projectMemberRepository.findByProjectIdAndUserId(projectId, userId);
    if (!membership) {
      throw new ForbiddenError('You are not a member of this project');
    }
    return membership;
  }

  function requireManager(userId, projectId) {
    const membership = requireMember(userId, projectId);
    if (membership.role !== Role.MANAGER) {
      throw new ForbiddenError('Only a project manager can do this');
    }
    return membership;
  }

  return { requireMember, requireManager };
}

module.exports = { createAccessControlService };
