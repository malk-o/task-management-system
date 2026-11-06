import { useEffect, useState } from 'react';
import { api } from './api.js';
import { initials } from './time.js';
import {
  BrandMark, IconBell, IconChart, IconClipboard, IconFile, IconRepeat,
} from './components/Icons.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import RecurringRulesPage from './pages/RecurringRulesPage.jsx';
import TaskDetailsPage from './pages/TaskDetailsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';

// Each member adds their page here. Owner in brackets. A page renders its own <section> with an <h2> title.
const NAV = [
  { id: 'projects', label: 'Projects & Tasks', Icon: IconClipboard }, // Member B
  { id: 'recurring', label: 'Recurring', Icon: IconRepeat }, // Member A
  { id: 'details', label: 'Task Details', Icon: IconFile }, // Members C and D
  { id: 'reports', label: 'Reports', Icon: IconChart }, // Member C
  { id: 'notifications', label: 'Notifications', Icon: IconBell }, // Member E
];

export default function App() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('notifications');
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

  // Load the seeded users for the "signed in as" picker.
  useEffect(() => {
    api('/users')
      .then((list) => {
        setUsers(list);
        if (list.length > 0) setUserId(list[0].id);
      })
      .catch((e) => setError(`Cannot reach the backend: ${e.message}. Is "npm start" running in the backend folder?`));
  }, []);

  // Poll the unread count so the badge updates without a page refresh.
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

  const currentUser = users.find((u) => u.id === userId);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <span className="brand-name">Task &amp; Project<br />Management</span>
        </div>

        <nav className="nav" aria-label="Main">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              <Icon />
              <span>{label}</span>
              {id === 'notifications' && unread > 0 && (
                <span className="nav-badge" aria-label={`${unread} unread`}>{unread}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="account">
          <div className="account-row">
            <span className="avatar" aria-hidden="true">{initials(currentUser?.name)}</span>
            <label>
              <span className="account-label">Signed in as</span>
              <select value={userId ?? ''} onChange={(e) => setUserId(Number(e.target.value))}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </aside>

      <main className="content">
        {error && <p className="error">{error}</p>}
        {userId ? page : !error && <p className="muted">Loading…</p>}
      </main>
    </div>
  );
}
