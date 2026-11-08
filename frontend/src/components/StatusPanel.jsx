import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { timeAgo } from '../time.js';

// FR3 / NFR3 (Member C): status buttons that show only the allowed next statuses, plus the audit log.
export const STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const label = (status) => STATUS_LABELS[status] || status;

export default function StatusPanel({ task, userId, users, onChanged }) {
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadLog = () =>
    api(`/tasks/${task.id}/status-log`, userId)
      .then(setLog)
      .catch((e) => setError(e.message));

  useEffect(() => {
    setError('');
    loadLog();
  }, [task.id, task.status, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = async (status) => {
    setBusy(true);
    setError('');
    try {
      const updated = await api(`/tasks/${task.id}/status`, userId, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onChanged(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? `User ${id}`;

  return (
    <div className="status-panel">
      <p>
        Current status: <span className={`status-pill status-${task.status}`}>{label(task.status)}</span>
      </p>

      {task.allowedTransitions.length === 0 ? (
        <p className="muted">This task is Done; no further changes are allowed.</p>
      ) : (
        <div className="status-actions">
          <span className="muted">Move to:</span>
          {task.allowedTransitions.map((status) => (
            <button key={status} type="button" disabled={busy} onClick={() => move(status)}>
              {label(status)}
            </button>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}

      <h4>Status history</h4>
      {log.length === 0 ? (
        <p className="muted">No status changes yet.</p>
      ) : (
        <ul className="status-log">
          {log.map((entry) => (
            <li key={entry.id}>
              {label(entry.oldStatus)} → {label(entry.newStatus)} by {nameOf(entry.changedBy)}{' '}
              <span className="muted" title={entry.changedAt}>{timeAgo(entry.changedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}