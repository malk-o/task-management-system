'use strict';

const events = require('../events/events');
const { NotFoundError, InvalidRequestError } = require('../errors/errors');
const { extractMentions, mentionHandleOf } = require('../domain/mentions');

const MAX_COMMENT_LENGTH = 2000;

/**
 * FR4 (Member D): comments on a task and @mentions of project members.
 * Rules:
 *   - only members of the task's project can read or write its comments (NFR4)
 *   - a mention counts only for a member of the project; each person once per comment; never yourself
 *   - the comment and its mentions are saved in one transaction
 *   - for each valid mention a mentionCreated event is published; the Notification Service
 *     (Member E) turns it into a notification, so this service never calls it directly (Observer)
 */
function createCommentService({
  commentRepository, taskRepository, userRepository, projectMemberRepository,
  accessControlService, eventPublisher, runInTransaction, clock,
}) {
  function loadTask(taskId) {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }
    return task;
  }

  const nameOf = (userId) => userRepository.findById(userId)?.name ?? 'Former user';

  function projectMembers(projectId) {
    return projectMemberRepository.findByProjectId(projectId)
      .map((member) => userRepository.findById(member.userId))
      .filter(Boolean);
  }

  function findMentionedMembers(text, projectId, authorId) {
    const names = extractMentions(text);
    return projectMembers(projectId)
      .filter((user) => names.includes(mentionHandleOf(user)))
      .filter((user) => user.id !== authorId);
  }

  function addComment(taskId, userId, body) {
    const task = loadTask(taskId);
    accessControlService.requireMember(userId, task.projectId);

    const text = typeof body === 'string' ? body.trim() : '';
    if (text === '') {
      throw new InvalidRequestError('A comment cannot be empty');
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      throw new InvalidRequestError(`A comment can be at most ${MAX_COMMENT_LENGTH} characters`);
    }

    const mentioned = findMentionedMembers(text, task.projectId, userId);
    const comment = runInTransaction(() => commentRepository.saveWithMentions(
      { taskId, authorId: userId, body: text, createdAt: clock.now().toISOString() },
      mentioned.map((user) => user.id),
    ));

    // published after saving, so the listener can load the task
    mentioned.forEach((user) => eventPublisher.publish(events.mentionCreated(taskId, user.id, userId)));

    return {
      ...comment,
      authorName: nameOf(userId),
      mentions: mentioned.map((user) => ({ id: user.id, name: user.name })),
    };
  }

  function listComments(taskId, userId) {
    const task = loadTask(taskId);
    accessControlService.requireMember(userId, task.projectId);

    return commentRepository.findByTask(taskId).map((comment) => ({
      ...comment,
      authorName: nameOf(comment.authorId),
      mentions: commentRepository.findMentionedUserIds(comment.id)
        .map((id) => ({ id, name: nameOf(id) })),
    }));
  }

  return { addComment, listComments };
}

module.exports = { createCommentService };
