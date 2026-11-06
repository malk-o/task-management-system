'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const { createApp } = require('../../src/app');

/**
 * FR1 API tests: the real Express app on a random port, called with fetch.
 * A fresh container per test keeps rules and tasks of different tests apart.
 */
describe('Recurrence API', () => {
  let server;
  let baseUrl;
  let mona;
  let template;

  beforeEach(async () => {
    const c = buildTestContainer();
    const data = testData(c);
    server = createApp(c).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    mona = data.user('Mona');
    const project = data.project();
    data.member(project, mona, 'MANAGER');
    template = data.task({ project, assignee: mona, title: 'Weekly report' });
  });

  afterEach(() => new Promise((resolve) => server.close(resolve)));

  const call = (path, userId, { method = 'GET', body } = {}) =>
    fetch(`${baseUrl}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': String(userId) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  it('POST /recurrence-rules creates a weekly rule', async () => {
    const response = await call('/recurrence-rules', mona.id, {
      method: 'POST',
      body: { templateTaskId: template.id, frequency: 'WEEKLY', daysOfWeek: [1, 4] },
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.templateTaskId, template.id);
    assert.equal(body.frequency, 'WEEKLY');
    assert.deepEqual(body.daysOfWeek, [1, 4]);
  });

  it('GET /recurrence-rules lists the created rules', async () => {
    await call('/recurrence-rules', mona.id, {
      method: 'POST',
      body: { templateTaskId: template.id, frequency: 'DAILY' },
    });

    const body = await (await call('/recurrence-rules', mona.id)).json();

    assert.equal(body.length, 1);
    assert.equal(body[0].frequency, 'DAILY');
  });

  it('POST /recurrence-rules for an unknown task returns 404', async () => {
    const response = await call('/recurrence-rules', mona.id, {
      method: 'POST',
      body: { templateTaskId: 9999, frequency: 'DAILY' },
    });

    assert.equal(response.status, 404);
  });

  it('POST /recurrence-rules with an unknown frequency returns 400', async () => {
    const response = await call('/recurrence-rules', mona.id, {
      method: 'POST',
      body: { templateTaskId: template.id, frequency: 'YEARLY' },
    });

    assert.equal(response.status, 400);
  });

  it('POST /recurrence-rules without the X-User-Id header returns 400', async () => {
    const response = await call('/recurrence-rules', null, {
      method: 'POST',
      body: { templateTaskId: template.id, frequency: 'DAILY' },
    });

    assert.equal(response.status, 400);
  });
});