import { useEffect, useState } from 'react';
import { api } from './api.js';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import RecurringRulesPage from './pages/RecurringRulesPage.jsx';
import TaskDetailsPage from './pages/TaskDetailsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';

// Each member adds their page here. Owner in brackets.
const TABS = [
  { id: 'projects', label: 'Projects & Tasks', owner: 'B' },
  { id: 'recurring', label: 'Recurring', owner: 'A' },
  { id: 'details', label: 'Task Details', owner: 'C / D' },
  { id: 'reports', label: 'Reports', owner: 'C' },
  { id: 'notifications', label: 'Notifications', owner: 'E' },
];

export default function App() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('notifications');
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

  // Load the seeded users for the "log in as" picker.
  useEffect(() => {
    api('/users')
      .then((list) => {
        setUsers(list);
        if (list.length > 0) setUserId(list[0].id);
      })
      .catch((e) => setError(`Cannot reach the backend: ${e.message}`));
  }, []);

  // Poll the unread count so the bell updates without a page refresh.
  useEffect(() => {
    if (!userId) return undefined;
    const load = () =>
      api('/notifications/unread-count', userId)
        .then((r) => setUnread(r.count))
        .catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [userId]);

  const page = {
    projects: <ProjectsPage userId={userId} />,
    recurring: <RecurringRulesPage userId={userId} />,
    details: <TaskDetailsPage userId={userId} />,
    reports: <ReportsPage userId={userId} />,
    notifications: <NotificationsPage userId={userId} onChange={setUnread} />,
  }[tab];

  return (
    <div className="app">
      <header className="topbar">
        <h1>Task &amp; Project Management</h1>
        <div className="topbar-right">
          <button className="bell" onClick={() => setTab('notifications')} aria-label="Notifications">
            🔔{unread > 0 && <span className="badge">{unread}</span>}
          </button>
          <label>
            Logged in as{' '}
            <select value={userId ?? ''} onChange={(e) => setUserId(Number(e.target.value))}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {error && <p className="error">{error}</p>}
        {userId ? page : !error && <p>Loading…</p>}
      </main>
    </div>
  );
}
