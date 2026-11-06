'use strict';

/**
 * TODO Member D (FR4): addComment(...), list comments oldest first, detect valid @mentions of project
 * members and for each one call
 *   eventPublisher.publish(events.mentionCreated(taskId, mentionedUserId, authorId));
 * Mention each user at most once per comment.
 */
function createCommentService(deps) { // eslint-disable-line no-unused-vars
  return {};
}

module.exports = { createCommentService };
