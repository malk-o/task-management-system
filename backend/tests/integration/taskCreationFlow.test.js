'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');

/** FR2 end to end inside the backend: real container, real SQLite, real Observer. */
describe('Task creation and assignment flow (integration)', () => {
  let c;
  let mona;
  let sara;
  let omar;

  beforeEach(() => {
    c = buildTestContainer();
    const data = testData(c);
    mona = data.user('Mona');
    sara = data.user('Sara');
    omar = data.user('Omar');
  });

  it('createProject_storesTheProjectAndTheCreatorAsManager', () => {
    const project = c.projectService.createProject(mona.id, { name: 'Website' });

    const membership = c.projectMemberRepository.findByProjectIdAndUserId(project.id, mona.id);
    assert.equal(membership.role, 'MANAGER');
    assert.deepEqual(c.projectService.listProjects(mona.id).map((p) => p.id), [project.id]);
    assert.deepEqual(c.projectService.listProjects(sara.id), []);
  });

  it('addMember_makesTheUserAMemberOfTheProject', () => {
    const project = c.projectService.createProject(mona.id, { name: 'Website' });
    c.projectService.addMember(project.id, mona.id, { userId: sara.id });

    assert.equal(c.projectMemberRepository.existsByProjectIdAndUserId(project.id, sara.id), true);
    assert.equal(c.projectMemberRepository.findByProjectId(project.id).length, 2);
  });

  it('createTaskWithAssignee_isStoredAsTodoAndNotifiesTheAssigneeOnce', () => {
    const project = c.projectService.createProject(mona.id, { name: 'Website' });
    c.projectService.addMember(project.id, mona.id, { userId: sara.id });

    const task = c.taskService.createTask(mona.id, {
      projectId: project.id, title: 'Design homepage', priority: 'HIGH', assigneeId: sara.id,
    });

    const stored = c.taskRepository.findById(task.id);
    assert.equal(stored.status, 'TODO');
    assert.equal(stored.assigneeId, sara.id);
    const notifications = c.notificationRepository.findByRecipientId(sara.id);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].type, 'TASK_ASSIGNED');
    assert.equal(notifications[0].taskId, task.id);
  });

  it('assignTaskLater_notifiesTheNewAssignee', () => {
    const project = c.projectService.createProject(mona.id, { name: 'Website' });
    c.projectService.addMember(project.id, mona.id, { userId: omar.id });
    const task = c.taskService.createTask(mona.id, { projectId: project.id, title: 'Write copy' });
    assert.equal(c.notificationRepository.findByRecipientId(omar.id).length, 0);

    c.taskService.assignTask(task.id, omar.id, mona.id);

    assert.equal(c.taskRepository.findById(task.id).assigneeId, omar.id);
    assert.equal(c.notificationRepository.findByRecipientId(omar.id).length, 1);
  });

  it('assigningToSomeoneOutsideTheProject_changesNothingAndSendsNoNotification', () => {
    const project = c.projectService.createProject(mona.id, { name: 'Website' });
    const task = c.taskService.createTask(mona.id, { projectId: project.id, title: 'Write copy' });

    assert.throws(() => c.taskService.assignTask(task.id, sara.id, mona.id), /member of the project/);

    assert.equal(c.taskRepository.findById(task.id).assigneeId, null);
    assert.equal(c.notificationRepository.findByRecipientId(sara.id).length, 0);
  });

  it('taskFromTheFactory_canBeUsedByTheRecurrenceServiceToo', () => {
    const project = c.projectService.createProject(mona.id, { name: 'Website' });
    const template = c.taskService.createTask(mona.id, { projectId: project.id, title: 'Weekly sync' });
    c.recurrenceService.createRule({ templateTaskId: template.id, frequency: 'DAILY' });

    const created = c.recurrenceService.generateDue('2026-11-11');

    assert.equal(created, 1);
    const occurrence = c.taskRepository.findByRuleAndOccurrenceDate(1, '2026-11-11');
    assert.equal(occurrence.status, 'TODO');
    assert.equal(occurrence.title, 'Weekly sync');
  });
});