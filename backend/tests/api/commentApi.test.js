'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');
const { createApp } = require('../../src/app');

/** API tests for FR4 + NFR4 (Member D): the real Express app on a random port, real SQLite. */
describe('Comment API', () => {
  let server;
  let baseUrl;
  let mona;
  let sara;
  let nour;
  let task;

  beforeEach(async () => {
    const c = buildTestContainer();
    server = createApp(c).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const data = testData(c);
    mona = data.user('Mona');
    sara = data.user('Sara');
    nour = data.user('Nour'); // in no project
    const project = data.project();
    data.member(project, mona, 'MANAGER');
    data.member(project, sara, 'MEMBER');
    task = data.task({ project, assignee: sara, title: 'Prepare demo' });
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
  const postComment = (userId, body, taskId = task.id) =>
    call('/comments', userId, { method: 'POST', body: JSON.stringify({ taskId, body }) });
  const getComments = (userId, taskId = task.id) => call(`/comments?taskId=${taskId}`, userId);

  it('POST /comments by a member returns 201 with the comment and its mentions', async () => {
    const response = await postComment(mona.id, 'Kick-off @Sara');
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.body, 'Kick-off @Sara');
    assert.equal(body.authorName, 'Mona');
    assert.deepEqual(body.mentions, [{ id: sara.id, name: 'Sara' }]);
  });

  it('GET /comments?taskId= returns the comments oldest first', async () => {
    await postComment(mona.id, 'first');
    await postComment(sara.id, 'second');

    const response = await getComments(sara.id);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).map((c) => c.body), ['first', 'second']);
  });

  it('a mention creates a notification for the mentioned member', async () => {
    await postComment(mona.id, '@Sara can you check the slides?');

    const notifications = await (await call('/notifications', sara.id)).json();
    const mention = notifications.filter((n) => n.type === 'MENTION');
    assert.equal(mention.length, 1);
    assert.equal(mention[0].taskId, task.id);
  });

  it('a non-member gets 403 when reading or posting comments', async () => {
    assert.equal((await getComments(nour.id)).status, 403);
    const response = await postComment(nour.id, 'let me in');
    assert.equal(response.status, 403);
    assert.match((await response.json()).message, /not a member/i);
  });

  it('a non-member cannot open the project report (NFR4)', async () => {
    assert.equal((await call('/reports/1', nour.id)).status, 403);
  });

  it('a member who is not a manager cannot open the project report (NFR4)', async () => {
    assert.equal((await call('/reports/1', sara.id)).status, 403);
  });

  it('an empty comment returns 400', async () => {
    assert.equal((await postComment(sara.id, '   ')).status, 400);
  });

  it('an unknown task returns 404', async () => {
    assert.equal((await getComments(sara.id, 9999)).status, 404);
  });

  it('a missing or non-numeric taskId returns 400', async () => {
    assert.equal((await call('/comments', sara.id)).status, 400);
    assert.equal((await getComments(sara.id, 'abc')).status, 400);
  });

  it('a request from a user who is not signed in returns 401', async () => {
    assert.equal((await getComments(null)).status, 401);
  });
});
