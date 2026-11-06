import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { timeAgo } from '../time.js';
import { IconArrowRight, IconAt, IconBell, IconCheck, IconClock, IconUserPlus } from '../components/Icons.jsx';

// How each notification type looks: label, icon and colour tone.
const TYPES = {
  TASK_ASSIGNED: { label: 'Assigned to you', Icon: IconUserPlus, tone: 'blue' },
  STATUS_CHANGED: { label: 'Status changed', Icon: IconArrowRight, tone: 'amber' },
  MENTION: { label: 'Mention', Icon: IconAt, tone: 'violet' },
  DUE_SOON: { label: 'Due soon', Icon: IconClock, tone: 'red' },
};

function FeedRow({ notification, onMarkRead }) {
  const { label, Icon, tone } = TYPES[notification.type] || TYPES.TASK_ASSIGNED;
  return (
    <li className={`feed-row${notification.read ? '' : ' unread'}`}>
      <span className={`type-tile tone-${tone}`}><Icon size={18} /></span>
      <div className="feed-body">
        <p className="feed-message">{notification.message}</p>
        <p className="feed-meta">
          <span className={`feed-type tone-${tone}`}>{label}</span>
          <span title={new Date(notification.createdAt).toLocaleString()}>{timeAgo(notification.createdAt)}</span>
        </p>
      </div>
      {!notification.read && (
        <button type="button" className="link-button" onClick={() => onMarkRead(notification.id)}>
          <IconCheck size={16} /> Mark as read
        </button>
      )}
    </li>
  );
}

// FR5 (Member E): notifications for the signed-in user, with mark-as-read.
export default function NotificationsPage({ userId, onChange }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await api('/notifications', userId);
      setItems(list);
      onChange(list.filter((n) => !n.read).length);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, [userId, onChange]);

  useEffect(() => {
    setLoaded(false);
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

  const unread = items.filter((n) => !n.read);
  const earlier = items.filter((n) => n.read);

  return (
    <section>
      <h2>Notifications</h2>
      <p className="subtitle">
        {unread.length > 0 ? `${unread.length} unread` : 'You are all caught up'}
      </p>

      {error && <p className="error">{error}</p>}

      {loaded && !error && items.length === 0 && (
        <div className="empty">
          <IconBell size={28} />
          <p>Nothing here yet. You will see new assignments, status changes, mentions and due dates in this list.</p>
        </div>
      )}

      {unread.length > 0 && (
        <>
          <h3 className="feed-heading">New</h3>
          <ul className="feed">
            {unread.map((n) => <FeedRow key={n.id} notification={n} onMarkRead={markRead} />)}
          </ul>
        </>
      )}

      {earlier.length > 0 && (
        <>
          <h3 className="feed-heading">Earlier</h3>
          <ul className="feed">
            {earlier.map((n) => <FeedRow key={n.id} notification={n} onMarkRead={markRead} />)}
          </ul>
        </>
      )}
    </section>
  );
}
