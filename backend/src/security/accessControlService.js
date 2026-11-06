'use strict';

/**
 * NFR4 (Member D owns this). Every controller/service that touches project data should call it.
 * Throw ForbiddenError (errors/errors.js) when a check fails.
 *
 * TODO Member D: this base version allows everything so the other members can build.
 * Replace it with real checks using projectMemberRepository (member of the project? manager?).
 */
function createAccessControlService({ projectMemberRepository }) { // eslint-disable-line no-unused-vars
  return {
    requireMember(userId, projectId) { // eslint-disable-line no-unused-vars
      // TODO Member D
    },
    requireManager(userId, projectId) { // eslint-disable-line no-unused-vars
      // TODO Member D
    },
  };
}

module.exports = { createAccessControlService };
