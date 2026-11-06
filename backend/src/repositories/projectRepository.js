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
  };
}

module.exports = { createProjectRepository };
