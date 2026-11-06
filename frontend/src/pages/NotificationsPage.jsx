import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

// FR5 (Member E): list of notifications for the logged-in user, with mark-as-read.
export default function NotificationsPage({ userId, onChange }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await api('/notifications', userId);
      setItems(list);
      onChange(list.filter((n) => !n.read).length);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [userId, onChange]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, userId, { method: 'PATCH' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>Notifications</h2>
      {error && <p className="error">{error}</p>}
      {items.length === 0 && !error && <p className="muted">No notifications yet.</p>}
      <ul className="notification-list">
        {items.map((n) => (
          <li key={n.id} className={n.read ? 'read' : 'unread'}>
            <div>
              <span className={`type type-${n.type}`}>{n.type.replace('_', ' ')}</span>
              <p>{n.message}</p>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
            {!n.read && <button onClick={() => markRead(n.id)}>Mark as read</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
