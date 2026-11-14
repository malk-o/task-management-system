import { useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth/AuthContext.jsx';
import AccountMenu from './components/AccountMenu.jsx';
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
  const { user: currentUser, signOut } = useAuth();
  const userId = currentUser.id;
  const [tab, setTab] = useState('notifications');
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

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

        <AccountMenu user={currentUser} onSignOut={signOut} />
      </aside>

      <main className="content">
        {error && <p className="error">{error}</p>}
        {userId ? page : !error && <p className="muted">Loading…</p>}
      </main>
    </div>
  );
}
