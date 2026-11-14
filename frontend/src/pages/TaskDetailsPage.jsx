import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StatusPanel, { label } from '../components/StatusPanel.jsx';
import CommentsSection from '../components/CommentsSection.jsx';

// Members C and D. Member C: the status panel (FR3, NFR3). Member D: the comments (FR4, NFR4).
export default function TaskDetailsPage({ userId }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    Promise.all([api('/tasks', userId), api('/users', userId)])
      .then(([taskList, userList]) => {
        setTasks(taskList);
        setUsers(userList);
        setSelectedId((current) => current ?? taskList[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, [userId]);

  const task = tasks.find((t) => t.id === selectedId);

  const replaceTask = (updated) =>
    setTasks((list) => list.map((t) => (t.id === updated.id ? updated : t)));

  return (
    <section>
      <h2>Task Details</h2>
      <p className="subtitle">Pick a task, move it through the workflow and see its history.</p>
      {error && <p className="error">{error}</p>}
      {tasks.length === 0 && !error && <p className="muted">No tasks yet.</p>}

      {tasks.length > 0 && (
        <label className="task-picker">
          <span className="muted">Task</span>
          <select value={selectedId ?? ''} onChange={(e) => setSelectedId(Number(e.target.value))}>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>#{t.id} {t.title} ({label(t.status)})</option>
            ))}
          </select>
        </label>
      )}

      {task && (
        <StatusPanel task={task} userId={userId} users={users} onChanged={replaceTask} />
      )}

      {task && <CommentsSection taskId={task.id} userId={userId} />}
    </section>
  );
}
