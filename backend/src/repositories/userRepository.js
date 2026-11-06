'use strict';

const toUser = (row) => (row ? { id: row.id, name: row.name, email: row.email } : null);

function createUserRepository(db) {
  return {
    save(user) {
      const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
        .run(user.name, user.email ?? null);
      return { ...user, id: Number(result.lastInsertRowid) };
    },
    findById(id) {
      return toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },
    findAll() {
      return db.prepare('SELECT * FROM users ORDER BY id').all().map(toUser);
    },
  };
}

module.exports = { createUserRepository };
