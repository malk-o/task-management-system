'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildTestContainer, testData } = require('../helpers/testContainer');

/** NFR3 Auditability: the status log is append-only. Real SQLite, no mocks. */
describe('StatusLogRepository (integration)', () => {
  let c;
  let task;
  let user;

  beforeEach(() => {
    c = buildTestContainer();
    const data = testData(c);
    user = data.user('Sara');
    task = data.task({ project: data.project() });
  });

  const entry = (overrides = {}) => ({
    taskId: task.id, oldStatus: 'TODO', newStatus: 'IN_PROGRESS', changedBy: user.id,
    changedAt: '2026-11-10T10:00:00.000Z', ...overrides,
  });

  it('append_storesTheEntryWithUserAndTimestamp', () => {
    const saved = c.statusLogRepository.append(entry());

    assert.ok(saved.id > 0);
    assert.equal(saved.changedBy, user.id);
    assert.equal(saved.changedAt, '2026-11-10T10:00:00.000Z');
  });

  it('findByTaskId_returnsEntriesOldestFirst', () => {
    c.statusLogRepository.append(entry({ changedAt: '2026-11-10T10:00:00.000Z' }));
    c.statusLogRepository.append(entry({
      oldStatus: 'IN_PROGRESS', newStatus: 'IN_REVIEW', changedAt: '2026-11-10T11:00:00.000Z',
    }));

    const log = c.statusLogRepository.findByTaskId(task.id);

    assert.deepEqual(log.map((e) => e.newStatus), ['IN_PROGRESS', 'IN_REVIEW']);
  });

  it('theRepository_exposesNoUpdateOrDelete', () => {
    assert.deepEqual(Object.keys(c.statusLogRepository).sort(), ['append', 'findByTaskId']);
  });

  it('anExistingEntry_cannotBeUpdated_evenWithRawSql', () => {
    const saved = c.statusLogRepository.append(entry());

    assert.throws(
      () => c.db.prepare('UPDATE status_log SET new_status = ? WHERE id = ?').run('DONE', saved.id),
      /append-only/,
    );
  });

  it('anExistingEntry_cannotBeDeleted_evenWithRawSql', () => {
    const saved = c.statusLogRepository.append(entry());

    assert.throws(() => c.db.prepare('DELETE FROM status_log WHERE id = ?').run(saved.id), /append-only/);
  });
});