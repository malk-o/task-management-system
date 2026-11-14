'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCommentService } = require('../../src/services/commentService');
const { EventType } = require('../../src/events/events');
const { ForbiddenError, NotFoundError, InvalidRequestError } = require('../../src/errors/errors');

/** FR4 (Member D): comments and @mentions, with fakes instead of the database. */
const NOW = new Date('2026-11-10T10:00:00.000Z');
const users = [
  { id: 1, name: 'Mona Manager' },
  { id: 2, name: 'Sara Member' },
  { id: 3, name: 'Omar Member' },
  { id: 5, name: 'Nour Member' }, // not in the project
];
const projectMembers = [
  { projectId: 1, userId: 1, role: 'MANAGER' },
  { projectId: 1, userId: 2, role: 'MEMBER' },
  { projectId: 1, userId: 3, role: 'MEMBER' },
];

function setup({ deny = false } = {}) {
  const saved = [];
  const published = [];
  const accessChecks = [];
  const deps = {
    taskRepository: { findById: (id) => (id === 10 ? { id: 10, projectId: 1, title: 'Prepare demo' } : null) },
    userRepository: { findById: (id) => users.find((u) => u.id === id) ?? null },
    projectMemberRepository: { findByProjectId: (pid) => projectMembers.filter((m) => m.projectId === pid) },
    commentRepository: {
      saveWithMentions: (comment, mentionedUserIds) => {
        saved.push({ comment, mentionedUserIds });
        return { id: saved.length, ...comment };
      },
      findByTask: () => [
        { id: 1, taskId: 10, authorId: 1, body: 'Kick-off @Sara', createdAt: '2026-11-10T09:00:00.000Z' },
        { id: 2, taskId: 10, authorId: 2, body: 'On it', createdAt: '2026-11-10T09:05:00.000Z' },
      ],
      findMentionedUserIds: (commentId) => (commentId === 1 ? [2] : []),
    },
    accessControlService: {
      requireMember: (userId, projectId) => {
        accessChecks.push([userId, projectId]);
        if (deny) throw new ForbiddenError('You are not a member of this project');
      },
    },
    eventPublisher: { publish: (event) => published.push(event) },
    runInTransaction: (work) => work(),
    clock: { now: () => NOW },
  };
  return { service: createCommentService(deps), saved, published, accessChecks };
}

describe('CommentService (unit)', () => {
  it('addComment_savesTrimmedTextWithAuthorAndTime', () => {
    const { service, saved } = setup();
    const comment = service.addComment(10, 2, '  Slides are ready  ');

    assert.deepEqual(saved[0].comment, {
      taskId: 10, authorId: 2, body: 'Slides are ready', createdAt: NOW.toISOString(),
    });
    assert.equal(comment.authorName, 'Sara Member');
  });

  it('addComment_checksMembershipOfTheTasksProject', () => {
    const { service, accessChecks } = setup();
    service.addComment(10, 2, 'hello');
    assert.deepEqual(accessChecks, [[2, 1]]);
  });

  it('nonMember_cannotComment_nothingSavedNoEvent', () => {
    const { service, saved, published } = setup({ deny: true });
    assert.throws(() => service.addComment(10, 5, 'let me in @Sara'), ForbiddenError);
    assert.equal(saved.length, 0);
    assert.equal(published.length, 0);
  });

  it('missingTask_isNotFound', () => {
    const { service } = setup();
    assert.throws(() => service.addComment(999, 2, 'hello'), NotFoundError);
  });

  it('emptyComment_isRejected', () => {
    const { service, saved } = setup();
    assert.throws(() => service.addComment(10, 2, '   '), InvalidRequestError);
    assert.equal(saved.length, 0);
  });

  it('tooLongComment_isRejected', () => {
    const { service } = setup();
    assert.throws(() => service.addComment(10, 2, 'a'.repeat(2001)), InvalidRequestError);
  });

  it('validMention_publishesExactlyOneMentionCreatedEvent', () => {
    const { service, saved, published } = setup();
    service.addComment(10, 1, '@Sara can you check this?');

    assert.deepEqual(saved[0].mentionedUserIds, [2]);
    assert.equal(published.length, 1);
    assert.equal(published[0].type, EventType.MENTION_CREATED);
    assert.equal(published[0].taskId, 10);
    assert.equal(published[0].mentionedUserId, 2);
    assert.equal(published[0].mentionedByUserId, 1);
  });

  it('sameUserMentionedTwice_isNotifiedOnce', () => {
    const { service, published } = setup();
    service.addComment(10, 1, '@Omar please review. Thanks @omar!');
    assert.equal(published.length, 1);
  });

  it('twoDifferentMentions_publishTwoEvents', () => {
    const { service, published } = setup();
    service.addComment(10, 1, '@Sara and @Omar, sync at 2?');
    assert.deepEqual(published.map((e) => e.mentionedUserId), [2, 3]);
  });

  it('mentionOfNonMember_isIgnored', () => {
    const { service, saved, published } = setup();
    service.addComment(10, 1, 'Ask @Nour about it');
    assert.deepEqual(saved[0].mentionedUserIds, []);
    assert.equal(published.length, 0);
  });

  it('mentioningYourself_createsNoEvent', () => {
    const { service, published } = setup();
    service.addComment(10, 2, 'Note to self @Sara');
    assert.equal(published.length, 0);
  });

  it('listComments_returnsAuthorNamesAndMentions', () => {
    const { service } = setup();
    const comments = service.listComments(10, 2);

    assert.deepEqual(comments.map((c) => c.authorName), ['Mona Manager', 'Sara Member']);
    assert.deepEqual(comments[0].mentions, [{ id: 2, name: 'Sara Member' }]);
  });

  it('listComments_nonMember_isRejected', () => {
    const { service } = setup({ deny: true });
    assert.throws(() => service.listComments(10, 5), ForbiddenError);
  });
});
