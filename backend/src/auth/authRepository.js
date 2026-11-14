'use strict';

/** Tables added by the login module. Created automatically on start; no existing table is changed. */
const AUTH_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_credentials (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
`;

const toUser = (row) => (row ? { id: row.id, name: row.name, email: row.email } : null);

/** All SQL of the login module lives here (repository layer). */
function createAuthRepository(db) {
  db.exec(AUTH_SCHEMA);

  return {
    findUserByEmail(email) {
      return toUser(db.prepare('SELECT id, name, email FROM users WHERE lower(email) = lower(?)').get(email));
    },
    findUserById(id) {
      return toUser(db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id));
    },
    findUsersWithoutCredentials() {
      return db.prepare(
        `SELECT u.id, u.name, u.email FROM users u
         LEFT JOIN user_credentials c ON c.user_id = u.id
         WHERE c.user_id IS NULL ORDER BY u.id`,
      ).all().map(toUser);
    },
    saveCredentials(userId, passwordHash) {
      db.prepare('INSERT OR REPLACE INTO user_credentials (user_id, password_hash) VALUES (?, ?)')
        .run(userId, passwordHash);
    },
    findPasswordHash(userId) {
      const row = db.prepare('SELECT password_hash FROM user_credentials WHERE user_id = ?').get(userId);
      return row ? row.password_hash : null;
    },
    createSession({ tokenHash, userId, createdAt, expiresAt }) {
      db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .run(tokenHash, userId, createdAt, expiresAt);
    },
    findSession(tokenHash) {
      const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash);
      return row ? { userId: row.user_id, expiresAt: row.expires_at } : null;
    },
    deleteSession(tokenHash) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    },
    deleteExpiredSessions(nowIso) {
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso);
    },
    /** The user's role in every project they belong to (roles are per project). */
    findMemberships(userId) {
      return db.prepare(
        `SELECT pm.project_id, pm.role, p.name AS project_name
         FROM project_members pm JOIN projects p ON p.id = pm.project_id
         WHERE pm.user_id = ? ORDER BY pm.project_id`,
      ).all(userId).map((row) => ({
        projectId: row.project_id, projectName: row.project_name, role: row.role,
      }));
    },
  };
}

module.exports = { createAuthRepository };
