'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const { createApp } = require('../../src/app');

/** API tests for FR2 (projects and tasks): the real Express app on a random port, real SQLite. */
describe('Project and task API', () => {
  let server;
  let baseUrl;
  let c;
  let mona;
  let sara;
  let omar;

  beforeEach(async () => {
    c = buildTestContainer();
    server = createApp(c).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    const data = testData(c);
    mona = data.user('Mona');
    sara = data.user('Sara');
    omar = data.user('Omar');
  });

  afterEach(() => new Promise((resolve) => server.close(resolve)));

  const call = (path, userId, method = 'GET', body = undefined) =>
    fetch(`${baseUrl}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': String(userId) } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  async function projectWithSara() {
    const project = await (await call('/projects', mona.id, 'POST', { name: 'Website' })).json();
    await call(`/projects/${project.id}/members`, mona.id, 'POST', { userId: sara.id });
    return project;
  }

  it('POST /projects creates a project and returns 201', async () => {
    const response = await call('/projects', mona.id, 'POST', { name: 'Website' });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.name, 'Website');
  });

  it('POST /projects without a name returns 400', async () => {
    const response = await call('/projects', mona.id, 'POST', { name: '' });
    assert.equal(response.status, 400);
  });

  it('GET /projects lists only the current users projects', async () => {
    await call('/projects', mona.id, 'POST', { name: 'Mine' });
    await call('/projects', sara.id, 'POST', { name: 'Hers' });

    const body = await (await call('/projects', mona.id)).json();

    assert.deepEqual(body.map((p) => p.name), ['Mine']);
  });

  it('POST /projects/:id/members adds a member and GET /projects/:id lists the members', async () => {
    const project = await projectWithSara();

    const details = await (await call(`/projects/${project.id}`, mona.id)).json();

    assert.deepEqual(details.members.map((m) => [m.name, m.role]), [['Mona', 'MANAGER'], ['Sara', 'MEMBER']]);
  });

  it('POST /projects/:id/members twice for the same user returns 400', async () => {
    const project = await projectWithSara();
    const response = await call(`/projects/${project.id}/members`, mona.id, 'POST', { userId: sara.id });
    assert.equal(response.status, 400);
  });

  it('POST /projects/:id/members for an unknown user returns 404', async () => {
    const project = await projectWithSara();
    const response = await call(`/projects/${project.id}/members`, mona.id, 'POST', { userId: 999 });
    assert.equal(response.status, 404);
  });

  it('GET /projects/:id for an unknown project returns 404', async () => {
    assert.equal((await call('/projects/999', mona.id)).status, 404);
  });

  it('GET /projects/abc returns 400', async () => {
    assert.equal((await call('/projects/abc', mona.id)).status, 400);
  });

  it('POST /tasks creates a To Do task assigned to a member and returns 201', async () => {
    const project = await projectWithSara();

    const response = await call('/tasks', mona.id, 'POST', {
      projectId: project.id, title: 'Design homepage', assigneeId: sara.id, priority: 'HIGH',
    });
    const task = await response.json();

    assert.equal(response.status, 201);
    assert.equal(task.status, 'TODO');
    assert.equal(task.assigneeId, sara.id);
    assert.equal(task.priority, 'HIGH');
  });

  it('POST /tasks notifies the assignee', async () => {
    const project = await projectWithSara();
    await call('/tasks', mona.id, 'POST', { projectId: project.id, title: 'Design homepage', assigneeId: sara.id });

    const notifications = await (await call('/notifications', sara.id)).json();

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].type, 'TASK_ASSIGNED');
  });

  it('POST /tasks without a title returns 400', async () => {
    const project = await projectWithSara();
    const response = await call('/tasks', mona.id, 'POST', { projectId: project.id, title: '' });
    assert.equal(response.status, 400);
  });

  it('POST /tasks with an assignee outside the project returns 400', async () => {
    const project = await projectWithSara();
    const response = await call('/tasks', mona.id, 'POST', { projectId: project.id, title: 'X', assigneeId: omar.id });
    assert.equal(response.status, 400);
  });

  it('POST /tasks for an unknown project returns 404', async () => {
    const response = await call('/tasks', mona.id, 'POST', { projectId: 999, title: 'X' });
    assert.equal(response.status, 404);
  });

  it('PATCH /tasks/:id/assignee assigns the task and returns it', async () => {
    const project = await projectWithSara();
    const task = await (await call('/tasks', mona.id, 'POST', { projectId: project.id, title: 'Write copy' })).json();

    const response = await call(`/tasks/${task.id}/assignee`, mona.id, 'PATCH', { assigneeId: sara.id });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.assigneeId, sara.id);
  });

  it('PATCH /tasks/:id/assignee without an assigneeId returns 400', async () => {
    const project = await projectWithSara();
    const task = await (await call('/tasks', mona.id, 'POST', { projectId: project.id, title: 'Write copy' })).json();
    const response = await call(`/tasks/${task.id}/assignee`, mona.id, 'PATCH', {});
    assert.equal(response.status, 400);
  });

  it('PATCH /tasks/:id/assignee for an unknown task returns 404', async () => {
    const response = await call('/tasks/999/assignee', mona.id, 'PATCH', { assigneeId: sara.id });
    assert.equal(response.status, 404);
  });

  it('GET /projects/:id/tasks lists the tasks of the project', async () => {
    const project = await projectWithSara();
    await call('/tasks', mona.id, 'POST', { projectId: project.id, title: 'One' });
    await call('/tasks', mona.id, 'POST', { projectId: project.id, title: 'Two' });

    const body = await (await call(`/projects/${project.id}/tasks`, mona.id)).json();

    assert.deepEqual(body.map((t) => t.title), ['One', 'Two']);
  });

  it('requests without signing in return 401', async () => {
    assert.equal((await call('/projects', null)).status, 401);
    assert.equal((await call('/tasks', null, 'POST', { projectId: 1, title: 'X' })).status, 401);
  });

  it('the status routes of Member C still work next to the task router', async () => {
    const project = await projectWithSara();
    const task = await (await call('/tasks', mona.id, 'POST', { projectId: project.id, title: 'Write copy' })).json();

    const response = await call(`/tasks/${task.id}`, mona.id);

    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).allowedTransitions, ['IN_PROGRESS']);
  });
});