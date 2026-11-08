'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const { createApp } = require('../../src/app');

/** API tests for FR3 (status): the real Express app on a random port, real SQLite. */
describe('Status API', () => {
  let server;
  let baseUrl;
  let c;
  let data;
  let mona;
  let sara;
  let project;
  let task;

  // A fresh database per test: the status log is append-only, so it cannot be cleaned with DELETE.
  beforeEach(async () => {
    c = buildTestContainer();
    server = createApp(c).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    data = testData(c);
    mona = data.user('Mona');
    sara = data.user('Sara');
    project = data.project();
    data.member(project, mona, 'MANAGER');
    data.member(project, sara, 'MEMBER');
    task = data.task({ project, assignee: sara, title: 'Prepare demo', dueDate: '2026-11-01T10:00:00.000Z' });
  });

  afterEach(() => new Promise((resolve) => server.close(resolve)));

  const call = (path, userId, options = {}) =>
    fetch(`${baseUrl}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': String(userId) } : {}),
      },
    });
  const patchStatus = (userId, status) =>
    call(`/tasks/${task.id}/status`, userId, { method: 'PATCH', body: JSON.stringify({ status }) });

  it('PATCH /tasks/:id/status accepts a valid transition', async () => {
    const response = await patchStatus(sara.id, 'IN_PROGRESS');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'IN_PROGRESS');
    assert.deepEqual(body.allowedTransitions, ['IN_REVIEW', 'TODO']);
  });

  it('PATCH /tasks/:id/status rejects To Do -> Done with 400', async () => {
    const response = await patchStatus(sara.id, 'DONE');

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /cannot move/i);
  });

  it('PATCH /tasks/:id/status on a missing task returns 404', async () => {
    const response = await call('/tasks/9999/status', sara.id, {
      method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });

    assert.equal(response.status, 404);
  });

  it('PATCH /tasks/:id/status without a status returns 400', async () => {
    const response = await call(`/tasks/${task.id}/status`, sara.id, { method: 'PATCH', body: '{}' });

    assert.equal(response.status, 400);
  });

  it('PATCH /tasks/:id/status with a non-numeric id returns 400', async () => {
    const response = await call('/tasks/abc/status', sara.id, {
      method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });

    assert.equal(response.status, 400);
  });

  it('GET /tasks/:id/status-log lists the transitions oldest first', async () => {
    await patchStatus(sara.id, 'IN_PROGRESS');
    await patchStatus(sara.id, 'IN_REVIEW');

    const body = await (await call(`/tasks/${task.id}/status-log`, sara.id)).json();

    assert.deepEqual(body.map((e) => e.newStatus), ['IN_PROGRESS', 'IN_REVIEW']);
    assert.equal(body[0].changedBy, sara.id);
  });

  it('GET /tasks lists tasks with their allowed transitions', async () => {
    const body = await (await call('/tasks', sara.id)).json();

    assert.equal(body.length, 1);
    assert.equal(body[0].title, 'Prepare demo');
    assert.deepEqual(body[0].allowedTransitions, ['IN_PROGRESS']);
  });

  it('GET /tasks/:id returns one task with its allowed transitions', async () => {
    const body = await (await call(`/tasks/${task.id}`, sara.id)).json();

    assert.equal(body.id, task.id);
    assert.deepEqual(body.allowedTransitions, ['IN_PROGRESS']);
  });

  it('GET /tasks without the X-User-Id header returns 400', async () => {
    const response = await call('/tasks', null);

    assert.equal(response.status, 400);
  });
});