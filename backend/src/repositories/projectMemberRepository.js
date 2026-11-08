'use strict';

const toMember = (row) => (row
  ? { id: row.id, projectId: row.project_id, userId: row.user_id, role: row.role }
  : null);

function createProjectMemberRepository(db) {
  return {
    save(member) {
      const result = db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
        .run(member.projectId, member.userId, member.role);
      return { ...member, id: Number(result.lastInsertRowid) };
    },
    findByProjectId(projectId) {
      return db.prepare('SELECT * FROM project_members WHERE project_id = ? ORDER BY id')
        .all(projectId).map(toMember);
    },    
    findByProjectIdAndRole(projectId, role) {
      return db.prepare('SELECT * FROM project_members WHERE project_id = ? AND role = ? ORDER BY id')
        .all(projectId, role).map(toMember);
    },
    findByProjectIdAndUserId(projectId, userId) {
      return toMember(db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?')
        .get(projectId, userId));
    },
    existsByProjectIdAndUserId(projectId, userId) {
      return this.findByProjectIdAndUserId(projectId, userId) !== null;
    },
  };
}

module.exports = { createProjectMemberRepository };
