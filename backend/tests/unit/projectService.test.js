'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createProjectService } = require('../../src/services/projectService');
const { NotFoundError, InvalidRequestError } = require('../../src/errors/errors');

function buildFakes() {
  const projects = [];
  const members = [];
  const accessChecks = [];
  const users = new Map([[1, { id: 1, name: 'Mona' }], [2, { id: 2, name: 'Sara' }]]);

  const projectRepository = {
    save: (p) => { const s = { timeZone: 'Africa/Cairo', ...p, id: projects.length + 1 }; projects.push(s); return s; },
    findById: (id) => projects.find((p) => p.id === id) ?? null,
    findByMemberUserId: (userId) => projects.filter((p) => members.some((m) => m.projectId === p.id && m.userId === userId)),
  };
  const projectMemberRepository = {
    save: (m) => { const s = { ...m, id: members.length + 1 }; members.push(s); return s; },
    findByProjectId: (projectId) => members.filter((m) => m.projectId === projectId),
    existsByProjectIdAndUserId: (projectId, userId) => members.some((m) => m.projectId === projectId && m.userId === userId),
  };
  const userRepository = { findById: (id) => users.get(id) ?? null };
  const accessControlService = {
    requireManager: (userId, projectId) => accessChecks.push(['manager', userId, projectId]),
    requireMember: (userId, projectId) => accessChecks.push(['member', userId, projectId]),
  };
  return {
    projects, members, accessChecks,
    deps: { projectRepository, projectMemberRepository, userRepository, accessControlService, runInTransaction: (w) => w() },
  };
}

describe('ProjectService (unit)', () => {
  let fakes;
  let service;

  beforeEach(() => {
    fakes = buildFakes();
    service = createProjectService(fakes.deps);
  });

  it('createProject_savesTheProjectAndMakesTheCreatorItsManager', () => {
    const project = service.createProject(1, { name: 'Website' });

    assert.equal(project.name, 'Website');
    assert.deepEqual(fakes.members.map((m) => [m.projectId, m.userId, m.role]), [[project.id, 1, 'MANAGER']]);
  });

  it('createProject_withoutName_isRejected', () => {
    assert.throws(() => service.createProject(1, { name: '  ' }), InvalidRequestError);
    assert.equal(fakes.projects.length, 0);
  });

  it('createProject_unknownUser_isNotFound', () => {
    assert.throws(() => service.createProject(99, { name: 'X' }), NotFoundError);
  });

  it('addMember_addsARegularMemberByDefault', () => {
    const project = service.createProject(1, { name: 'Website' });
    const member = service.addMember(project.id, 1, { userId: 2 });

    assert.equal(member.role, 'MEMBER');
    assert.equal(member.userId, 2);
  });

  it('addMember_requiresAManager', () => {
    const project = service.createProject(1, { name: 'Website' });
    fakes.accessChecks.length = 0;
    service.addMember(project.id, 1, { userId: 2 });
    assert.deepEqual(fakes.accessChecks, [['manager', 1, project.id]]);
  });

  it('addMember_sameUserTwice_isRejected', () => {
    const project = service.createProject(1, { name: 'Website' });
    service.addMember(project.id, 1, { userId: 2 });
    assert.throws(() => service.addMember(project.id, 1, { userId: 2 }), InvalidRequestError);
  });

  it('addMember_unknownUserOrProject_isNotFound', () => {
    const project = service.createProject(1, { name: 'Website' });
    assert.throws(() => service.addMember(project.id, 1, { userId: 99 }), NotFoundError);
    assert.throws(() => service.addMember(77, 1, { userId: 2 }), NotFoundError);
  });

  it('addMember_invalidRole_isRejected', () => {
    const project = service.createProject(1, { name: 'Website' });
    assert.throws(() => service.addMember(project.id, 1, { userId: 2, role: 'OWNER' }), InvalidRequestError);
  });

  it('listProjects_returnsOnlyTheUsersProjects', () => {
    service.createProject(1, { name: 'Mine' });
    service.createProject(2, { name: 'Theirs' });

    assert.deepEqual(service.listProjects(1).map((p) => p.name), ['Mine']);
  });

  it('getProject_returnsTheProjectWithItsMembersAndNames', () => {
    const project = service.createProject(1, { name: 'Website' });
    service.addMember(project.id, 1, { userId: 2 });

    const details = service.getProject(project.id, 2);

    assert.equal(details.name, 'Website');
    assert.deepEqual(details.members.map((m) => [m.name, m.role]), [['Mona', 'MANAGER'], ['Sara', 'MEMBER']]);
  });
});