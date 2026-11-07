import { useEffect, useState } from 'react';

// FR4: comments on a task, oldest first, with @mentions.
// Use it inside the Task Details page:
//   <CommentsSection taskId={task.id} currentUserId={currentUser.id} />
// If the other pages call the backend through a shared helper (e.g. src/api.js),
// use that helper instead of request() below so the base URL and X-User-Id header match.
const API_BASE = '/api';

async function request(path, userId, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-User-Id': String(userId) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Shows "@Sara" in bold blue inside the comment text.
function CommentText({ text }) {
  const parts = text.split(/((?<!\w)@[A-Za-z][A-Za-z0-9_]*)/g);
  return (
    <p style={styles.body}>
      {parts.map((part, i) =>
        part.startsWith('@') ? <strong key={i} style={styles.mention}>{part}</strong> : part
      )}
    </p>
  );
}

export default function CommentsSection({ taskId, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!taskId || !currentUserId) return;
    setLoading(true);
    setError('');
    request(`/tasks/${taskId}/comments`, currentUserId)
      .then(setComments)
      .catch((err) => {
        setComments([]);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [taskId, currentUserId]);

  async function handlePost() {
    if (text.trim() === '') return;
    setPosting(true);
    setError('');
    try {
      const comment = await request(`/tasks/${taskId}/comments`, currentUserId, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      });
      setComments((old) => [...old, comment]); // newest goes at the bottom
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section style={styles.section}>
      <h3 style={styles.title}>Comments</h3>

      {error && <p role="alert" style={styles.error}>{error}</p>}

      {loading ? (
        <p style={styles.muted}>Loading comments…</p>
      ) : comments.length === 0 && !error ? (
        <p style={styles.muted}>No comments yet. Ask a question or share an update below.</p>
      ) : (
        <ul style={styles.list}>
          {comments.map((comment) => (
            <li key={comment.id} style={styles.item}>
              <div style={styles.meta}>
                <strong>{comment.authorName}</strong>{' '}
                <span style={styles.muted}>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <CommentText text={comment.body} />
            </li>
          ))}
        </ul>
      )}

      <label htmlFor="new-comment" style={styles.label}>Add a comment</label>
      <textarea
        id="new-comment"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment. Type @ and a first name to mention someone, e.g. @Sara"
        style={styles.textarea}
      />
      <button onClick={handlePost} disabled={posting || text.trim() === ''} style={styles.button}>
        {posting ? 'Posting…' : 'Post comment'}
      </button>
    </section>
  );
}

const styles = {
  section: { marginTop: 24, maxWidth: 720 },
  title: { margin: '0 0 12px' },
  list: { listStyle: 'none', padding: 0, margin: '0 0 16px' },
  item: { padding: '10px 0', borderBottom: '1px solid #e2e6ee' },
  meta: { fontSize: 14, marginBottom: 4 },
  body: { margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 },
  mention: { color: '#1d4ed8' },
  muted: { color: '#6b7280', fontSize: 13 },
  error: { color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: 6 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: 8, font: 'inherit', borderRadius: 6, border: '1px solid #cbd2dd' },
  button: { marginTop: 8, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1e3a8a', color: '#fff', cursor: 'pointer' },
};
