import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { label } from '../components/StatusPanel.jsx';

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

// FR2 / NFR2 (Member B): create a project, add members, then create and assign a task.
// Creating a task takes three steps: (1) choose the project, (2) type the title and choose who does it,
// (3) press "Create task".
export default function ProjectsPage({ userId }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [memberToAdd, setMemberToAdd] = useState('');
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadProjects = useCallback(async () => {
    const [userList, projectList] = await Promise.all([api('/users'), api('/projects', userId)]);
    setUsers(userList);
    setProjects(projectList);
    return projectList;
  }, [userId]);

  const loadProject = useCallback(async (id) => {
    if (!id) {
      setProject(null);
      setTasks([]);
      return;
    }
    const [details, taskList] = await Promise.all([
      api(`/projects/${id}`, userId),
      api(`/projects/${id}/tasks`, userId),
    ]);
    setProject(details);
    setTasks(taskList);
  }, [userId]);

  // reload when the signed-in user changes
  useEffect(() => {
    setError('');
    setMessage('');
    loadProjects()
      .then((list) => {
        const first = list[0] ? String(list[0].id) : '';
        setProjectId(first);
        return loadProject(first);
      })
      .catch((e) => setError(e.message));
  }, [userId, loadProjects, loadProject]);

  useEffect(() => {
    setAssigneeId('');
    setMemberToAdd('');
  }, [projectId, userId]);

  async function run(action, successMessage) {
    setError('');
    setMessage('');
    try {
      await action();
      if (successMessage) setMessage(successMessage);
    } catch (e) {
      setError(e.message);
    }
  }

  const post = (path, body, method = 'POST') =>
    api(path, userId, { method, body: JSON.stringify(body) });

  const createProject = (event) => {
    event.preventDefault();
    return run(async () => {
      const created = await post('/projects', { name: newProjectName });
      setNewProjectName('');
      await loadProjects();
      setProjectId(String(created.id));
      await loadProject(created.id);
    }, 'Project created');
  };

  const chooseProject = (id) => {
    setProjectId(id);
    return run(() => loadProject(id));
  };

  const addMember = (event) => {
    event.preventDefault();
    if (!memberToAdd) return undefined;
    return run(async () => {
      await post(`/projects/${projectId}/members`, { userId: Number(memberToAdd) });
      setMemberToAdd('');
      await loadProject(projectId);
    }, 'Member added');
  };

  const createTask = (event) => {
    event.preventDefault();
    return run(async () => {
      await post('/tasks', {
        projectId: Number(projectId),
        title,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        priority,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00Z`).toISOString() : null,
      });
      setTitle('');
      setAssigneeId('');
      setDueDate('');
      await loadProject(projectId);
    }, 'Task created');
  };

  const assign = (taskId, newAssigneeId) =>
    run(async () => {
      await post(`/tasks/${taskId}/assignee`, { assigneeId: Number(newAssigneeId) }, 'PATCH');
      await loadProject(projectId);
    }, 'Task assigned');

  const isManager = project?.members.some((m) => m.userId === userId && m.role === 'MANAGER');
  const nameOf = (id) => project?.members.find((m) => m.userId === id)?.name ?? '';
  const candidates = users.filter((u) => !project?.members.some((m) => m.userId === u.id));

  return (
    <section>
      <h2>Projects &amp; Tasks</h2>
      <p className="subtitle">Create a project, add your team, then create a task and assign it in three steps.</p>

      {error && <p className="error">{error}</p>}
      {message && <p className="muted">{message}</p>}

      <form className="inline-form" onSubmit={createProject}>
        <input
          aria-label="New project name"
          placeholder="New project name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
        />
        <button type="submit">Create project</button>
      </form>

      {projects.length === 0 ? (
        <p className="muted">You are not in any project yet. Create one above.</p>
      ) : (
        <>
          <form className="task-form">
            <label>
              <span className="step">Step 1</span> Choose the project
              <select value={projectId} onChange={(e) => chooseProject(e.target.value)}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </form>

          {project && (
            <>
              <h3>Members</h3>
              <ul>
                {project.members.map((m) => (
                  <li key={m.userId}>{m.name} <span className="muted">({m.role === 'MANAGER' ? 'manager' : 'member'})</span></li>
                ))}
              </ul>
              {isManager && candidates.length > 0 && (
                <form className="inline-form" onSubmit={addMember}>
                  <select aria-label="User to add" value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)}>
                    <option value="">Add a member…</option>
                    {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button type="submit" disabled={!memberToAdd}>Add member</button>
                </form>
              )}

              {isManager ? (
                <form className="task-form" onSubmit={createTask}>
                  <h3>Create a task</h3>
                  <label>
                    <span className="step">Step 2</span> Title and assignee
                    <input
                      placeholder="What needs to be done?"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  <label>
                    Assign to
                    <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                      <option value="">Unassigned</option>
                      {project.members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Priority (optional)
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Due date (optional)
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </label>
                  <button type="submit"><span className="step">Step 3</span> Create task</button>
                </form>
              ) : (
                <p className="muted">Only the project manager can create and assign tasks.</p>
              )}

              <h3>Tasks</h3>
              {tasks.length === 0 ? (
                <p className="muted">No tasks in this project yet.</p>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr><th>Task</th><th>Status</th><th>Priority</th><th>Assigned to</th></tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td><span className={`status-pill status-${t.status}`}>{label(t.status)}</span></td>
                        <td>{t.priority}</td>
                        <td>
                          {isManager ? (
                            <select
                              aria-label={`Assignee of ${t.title}`}
                              value={t.assigneeId ?? ''}
                              onChange={(e) => assign(t.id, e.target.value)}
                            >
                              <option value="" disabled>Unassigned</option>
                              {project.members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                            </select>
                          ) : (nameOf(t.assigneeId) || 'Unassigned')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}