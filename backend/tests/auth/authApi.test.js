'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../../src/db/database');
const { buildContainer } = require('../../src/container');
const { createApp } = require('../../src/app');

/**
 * Login module API tests (NFR4 Security). The real app runs on a random port and is called with
 * fetch. trustUserIdHeader is OFF here, so only real login sessions are accepted.
 */
function createClock() {
  let time = new Date('2026-11-10T10:00:00.000Z').getTime();
  return { now: () => new Date(time), advanceMinutes: (m) => { time += m * 60000; } };
}

describe('Authentication API', () => {
  let server;
  let baseUrl;
  let c;
  let clock;

  before(async () => {
    clock = createClock();
    c = buildContainer({ db: createDatabase(':memory:'), clock, config: { dueSoonWindowHours: 24 } });
    server = createApp(c).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    c.db.exec('DELETE FROM sessions; DELETE FROM user_credentials; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users;');
    // a fresh limiter for every test: restart the clock far ahead so old failures expire
    clock.advanceMinutes(60);
  });

  const post = (path, body, token) => fetch(`${baseUrl}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const get = (path, token, headers = {}) => fetch(`${baseUrl}/api${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
  });
  const register = async (overrides = {}) => {
    const body = { name: 'Sara Member', email: 'sara@example.com', password: 'Secret123', ...overrides };
    return post('/auth/register', body);
  };

  it('register_createsAccountAndSignsIn_withoutLeakingThePassword', async () => {
    const response = await register();
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.ok(body.token);
    assert.deepEqual(Object.keys(body.user).sort(), ['email', 'id', 'name']);
    assert.ok(!JSON.stringify(body).includes('Secret123'));
  });

  it('register_storesOnlyAHashOfThePassword', async () => {
    await register();

    const row = c.db.prepare('SELECT password_hash FROM user_credentials').get();
    assert.ok(row.password_hash.startsWith('scrypt:'));
    assert.ok(!row.password_hash.includes('Secret123'));
  });

  it('register_withExistingEmail_returns409_evenWithDifferentCase', async () => {
    await register();

    const response = await register({ email: 'SARA@Example.com' });

    assert.equal(response.status, 409);
  });

  it('register_withWeakPassword_returns400', async () => {
    for (const password of ['short1', 'longbutnonumbers', '123456789']) {
      const response = await register({ password });
      assert.equal(response.status, 400, `password "${password}" should be rejected`);
    }
    const body = await (await register({ password: 'short1' })).json();
    assert.match(body.message, /8/);
  });

  it('register_withInvalidEmailOrName_returns400', async () => {
    assert.equal((await register({ email: 'not-an-email' })).status, 400);
    assert.equal((await register({ name: 'A' })).status, 400);
  });

  it('login_returnsTokenThatWorksOnMe_withProjectRoles', async () => {
    const registered = await (await register()).json();
    const project = c.projectRepository.save({ name: 'Demo Project' });
    c.projectMemberRepository.save({ projectId: project.id, userId: registered.user.id, role: 'MANAGER' });

    const login = await post('/auth/login', { email: 'sara@example.com', password: 'Secret123' });
    const { token } = await login.json();
    const me = await (await get('/auth/me', token)).json();

    assert.equal(login.status, 200);
    assert.equal(me.name, 'Sara Member');
    assert.deepEqual(me.memberships, [{ projectId: project.id, projectName: 'Demo Project', role: 'MANAGER' }]);
  });

  it('login_withWrongPasswordOrUnknownEmail_returnsTheSame401Message', async () => {
    await register();

    const wrongPassword = await post('/auth/login', { email: 'sara@example.com', password: 'Wrong1234' });
    const unknownEmail = await post('/auth/login', { email: 'nobody@example.com', password: 'Secret123' });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal((await wrongPassword.json()).message, (await unknownEmail.json()).message);
  });

  it('login_withMissingFields_returns400', async () => {
    assert.equal((await post('/auth/login', {})).status, 400);
  });

  it('protectedRoute_withoutToken_returns401', async () => {
    assert.equal((await get('/notifications')).status, 401);
    assert.equal((await get('/users')).status, 401);
    assert.equal((await get('/auth/me')).status, 401);
  });

  it('protectedRoute_withInvalidToken_returns401', async () => {
    assert.equal((await get('/notifications', 'not-a-real-token')).status, 401);
  });

  it('protectedRoute_withValidToken_returns200', async () => {
    const { token } = await (await register()).json();

    assert.equal((await get('/notifications', token)).status, 200);
  });

  it('userIdHeaderAlone_isIgnored_soNobodyCanPretendToBeAnotherUser', async () => {
    const { user } = await (await register()).json();

    const response = await get('/notifications', null, { 'X-User-Id': String(user.id) });

    assert.equal(response.status, 401);
  });

  it('logout_endsTheSession', async () => {
    const { token } = await (await register()).json();

    const logout = await post('/auth/logout', {}, token);
    const after = await get('/auth/me', token);

    assert.equal(logout.status, 204);
    assert.equal(after.status, 401);
  });

  it('expiredSession_returns401', async () => {
    const { token } = await (await register()).json();

    clock.advanceMinutes(9 * 60); // sessions last 8 hours

    const response = await get('/auth/me', token);
    assert.equal(response.status, 401);
    assert.match((await response.json()).message, /expired/);
  });

  it('tooManyWrongPasswords_locksTheAccountTemporarily', async () => {
    await register();

    for (let i = 0; i < 5; i += 1) {
      const attempt = await post('/auth/login', { email: 'sara@example.com', password: 'Wrong1234' });
      assert.equal(attempt.status, 401);
    }
    const blocked = await post('/auth/login', { email: 'sara@example.com', password: 'Secret123' });
    assert.equal(blocked.status, 429);

    clock.advanceMinutes(11);
    const allowed = await post('/auth/login', { email: 'sara@example.com', password: 'Secret123' });
    assert.equal(allowed.status, 200);
  });

  it('loginAndRegister_workWithoutBeingSignedIn', async () => {
    assert.equal((await register()).status, 201);
    assert.equal((await post('/auth/login', { email: 'sara@example.com', password: 'Secret123' })).status, 200);
  });
});
