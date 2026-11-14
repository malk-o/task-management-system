'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const { createApp } = require('../../src/app');
const events = require('../../src/events/events');

/**
 * API tests: the real Express app on a random port, called with fetch.
 * They cover controller + service + repository + database together.
 */
describe('Notification API', () => {
  let server;
  let baseUrl;
  let c;
  let data;
  let sara;
  let mona;
  let task;

  before(async () => {
    c = buildTestContainer();
    server = createApp(c).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    data = testData(c);
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    c.db.exec('DELETE FROM notifications; DELETE FROM tasks; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users;');
    sara = data.user('Sara');
    mona = data.user('Mona');
    const project = data.project();
    task = data.task({ project, assignee: sara, title: 'Prepare demo' });
  });

  const call = (path, userId, options = {}) =>
    fetch(`${baseUrl}/api${path}`, {
      ...options,
      headers: { ...(userId ? { 'X-User-Id': String(userId) } : {}), ...(options.headers || {}) },
    });

  it('GET /notifications returns the current user\'s notifications, newest first', async () => {
    c.eventPublisher.publish(events.taskAssigned(task.id, sara.id, mona.id));
    c.eventPublisher.publish(events.taskDueSoon(task.id));

    const response = await call('/notifications', sara.id);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.length, 2);
    assert.equal(body[0].type, 'DUE_SOON');
    assert.equal(body[0].read, false);
    assert.deepEqual(Object.keys(body[0]).sort(), ['createdAt', 'id', 'message', 'read', 'taskId', 'type']);
  });

  it('GET /notifications does not show other users\' notifications', async () => {
    c.eventPublisher.publish(events.taskAssigned(task.id, sara.id, mona.id));

    const body = await (await call('/notifications', mona.id)).json();

    assert.deepEqual(body, []);
  });

  it('GET /notifications/unread-count counts only unread', async () => {
    c.eventPublisher.publish(events.taskAssigned(task.id, sara.id, mona.id));
    c.eventPublisher.publish(events.taskDueSoon(task.id));
    const first = (await (await call('/notifications', sara.id)).json())[0];
    await call(`/notifications/${first.id}/read`, sara.id, { method: 'PATCH' });

    const body = await (await call('/notifications/unread-count', sara.id)).json();

    assert.deepEqual(body, { count: 1 });
  });

  it('PATCH /notifications/:id/read marks it as read', async () => {
    c.eventPublisher.publish(events.taskAssigned(task.id, sara.id, mona.id));
    const [notification] = await (await call('/notifications', sara.id)).json();

    const response = await call(`/notifications/${notification.id}/read`, sara.id, { method: 'PATCH' });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.read, true);
  });

  it('PATCH /notifications/:id/read on someone else\'s notification returns 404', async () => {
    c.eventPublisher.publish(events.taskAssigned(task.id, sara.id, mona.id));
    const [notification] = await (await call('/notifications', sara.id)).json();

    const response = await call(`/notifications/${notification.id}/read`, mona.id, { method: 'PATCH' });

    assert.equal(response.status, 404);
    assert.match((await response.json()).message, /not found/);
  });

  it('PATCH /notifications/:id/read with a non-numeric id returns 400', async () => {
    const response = await call('/notifications/abc/read', sara.id, { method: 'PATCH' });

    assert.equal(response.status, 400);
  });

  it('GET /notifications without signing in returns 401', async () => {
    const response = await call('/notifications', null);

    assert.equal(response.status, 401);
  });

  it('GET /users lists users for the login picker', async () => {
    const body = await (await call('/users', sara.id)).json();

    assert.deepEqual(body.map((u) => u.name).sort(), ['Mona', 'Sara']);
  });

  it('unknown route returns 404 JSON', async () => {
    const response = await call('/nope', sara.id);

    assert.equal(response.status, 404);
  });
});
