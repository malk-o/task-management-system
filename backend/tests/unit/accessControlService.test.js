'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createAccessControlService } = require('../../src/security/accessControlService');
const { ForbiddenError } = require('../../src/errors/errors');

/** NFR4 (Member D): only project members see a project's data, only managers do manager actions. */
describe('AccessControlService (unit)', () => {
  // Fake repository: project 1 has Mona (manager) and Sara (member). Nour (5) is in no project.
  const members = [
    { projectId: 1, userId: 1, role: 'MANAGER' },
    { projectId: 1, userId: 2, role: 'MEMBER' },
  ];
  const projectMemberRepository = {
    findByProjectIdAndUserId: (projectId, userId) =>
      members.find((m) => m.projectId === projectId && m.userId === userId) ?? null,
  };
  const access = createAccessControlService({ projectMemberRepository });

  it('member_passesRequireMember', () => {
    assert.doesNotThrow(() => access.requireMember(2, 1));
  });

  it('manager_passesRequireMember', () => {
    assert.doesNotThrow(() => access.requireMember(1, 1));
  });

  it('nonMember_isRejectedWithForbidden', () => {
    assert.throws(() => access.requireMember(5, 1), ForbiddenError);
  });

  it('memberOfOneProject_isRejectedInAnotherProject', () => {
    assert.throws(() => access.requireMember(2, 2), ForbiddenError);
  });

  it('manager_passesRequireManager', () => {
    assert.doesNotThrow(() => access.requireManager(1, 1));
  });

  it('member_isRejectedByRequireManager', () => {
    assert.throws(() => access.requireManager(2, 1), { status: 403, message: /manager/i });
  });

  it('nonMember_isRejectedByRequireManager', () => {
    assert.throws(() => access.requireManager(5, 1), ForbiddenError);
  });
});
