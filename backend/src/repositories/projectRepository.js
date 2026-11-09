'use strict';

const toProject = (row) => (row ? { id: row.id, name: row.name, timeZone: row.time_zone } : null);

function createProjectRepository(db) {
  return {
    save(project) {
      const result = db.prepare('INSERT INTO projects (name, time_zone) VALUES (?, ?)')
        .run(project.name, project.timeZone ?? 'Africa/Cairo');
      return { timeZone: 'Africa/Cairo', ...project, id: Number(result.lastInsertRowid) };
    },
    findById(id) {
      return toProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
    },
    findAll() {
      return db.prepare('SELECT * FROM projects ORDER BY id').all().map(toProject);
    },
        /** FR2: the projects a user belongs to. */
    findByMemberUserId(userId) {
      return db.prepare(
        `SELECT p.* FROM projects p
         JOIN project_members m ON m.project_id = p.id
         WHERE m.user_id = ? ORDER BY p.id`,
      ).all(userId).map(toProject);
    },
  };
}

module.exports = { createProjectRepository };
