'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const { createApp } = require('../../src/app');

/** API tests for the project report (US6): the real Express app on a random port, real SQLite. */
describe('Report API', () => {
  let server;
  let baseUrl;
  let c;
  let data;
  let mona;
  let sara;
  let project;

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
    // The test clock says 2026-11-10, so this task is overdue and still open.
    data.task({ project, assignee: sara, title: 'Prepare demo', dueDate: '2026-11-01T10:00:00.000Z' });
  });

  afterEach(() => new Promise((resolve) => server.close(resolve)));

  const call = (path, userId) =>
    fetch(`${baseUrl}/api${path}`, {
      headers: userId ? { 'X-User-Id': String(userId) } : {},
    });

  it('GET /reports/:projectId returns completion rate, overdue and workload', async () => {
    data.task({ project, assignee: sara, title: 'Done one', status: 'DONE' });

    const response = await call(`/reports/${project.id}`, mona.id);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.completionRate, 50);
    assert.deepEqual(body.overdueTasks.map((x) => x.title), ['Prepare demo']);
    assert.deepEqual(body.workloadPerMember, [{ userId: sara.id, name: 'Sara', openTasks: 1 }]);
  });

  it('GET /reports/:projectId for an unknown project returns 404', async () => {
    const response = await call('/reports/9999', mona.id);

    assert.equal(response.status, 404);
  });

  it('GET /reports/:projectId with a non-numeric id returns 400', async () => {
    const response = await call('/reports/abc', mona.id);

    assert.equal(response.status, 400);
  });

  it('GET /reports/:projectId without X-User-Id returns 400', async () => {
    const response = await call(`/reports/${project.id}`, null);

    assert.equal(response.status, 400);
  });
});