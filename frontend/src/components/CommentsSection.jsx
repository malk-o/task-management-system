import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { initials, timeAgo } from '../time.js';

// FR4 (Member D): the comments of one task, oldest first, with @mentions of project members.
// The backend decides who may see them (NFR4); a non-member gets a 403 and sees the message instead.

// Shows the @names that really mentioned someone (returned by the backend) as highlighted text.
function CommentText({ text, mentions }) {
  const handles = mentions.map((m) => m.name.split(' ')[0].toLowerCase());
  const parts = text.split(/((?<!\w)@[A-Za-z][A-Za-z0-9_]*)/g);
  return (
    <p className="comment-text">
      {parts.map((part, i) =>
        part.startsWith('@') && handles.includes(part.slice(1).toLowerCase())
          ? <span key={i} className="mention">{part}</span>
          : part,
      )}
    </p>
  );
}

export default function CommentsSection({ taskId, userId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loadError, setLoadError] = useState('');
  const [postError, setPostError] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    setPostError('');
    api(`/comments?taskId=${taskId}`, userId)
      .then(setComments)
      .catch((e) => {
        setComments([]);
        setLoadError(e.message);
      })
      .finally(() => setLoading(false));
  }, [taskId, userId]);

  const post = async (event) => {
    event.preventDefault();
    setPosting(true);
    setPostError('');
    try {
      const comment = await api('/comments', userId, {
        method: 'POST',
        body: JSON.stringify({ taskId, body: text }),
      });
      setComments((list) => [...list, comment]); // newest at the bottom
      setText('');
    } catch (e) {
      setPostError(e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="comments-panel">
      <h3>Comments</h3>

      {loading && <p className="muted">Loading comments…</p>}

      {!loading && loadError && <p className="access-denied" role="alert">{loadError}</p>}

      {!loading && !loadError && (
        <>
          {comments.length === 0 ? (
            <p className="muted">No comments yet. Ask a question or share an update below.</p>
          ) : (
            <ul className="comment-list">
              {comments.map((c) => (
                <li key={c.id} className="comment">
                  <span className="avatar comment-avatar" aria-hidden="true">{initials(c.authorName)}</span>
                  <div className="comment-body">
                    <p className="comment-meta">
                      <strong>{c.authorName}</strong>{' '}
                      <span className="muted" title={new Date(c.createdAt).toLocaleString()}>{timeAgo(c.createdAt)}</span>
                    </p>
                    <CommentText text={c.body} mentions={c.mentions || []} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className="comment-form" onSubmit={post}>
            <label htmlFor="new-comment">Add a comment</label>
            <textarea
              id="new-comment"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type @ and a first name to mention a project member, e.g. @Sara"
            />
            {postError && <p className="error">{postError}</p>}
            <button type="submit" disabled={posting || text.trim() === ''}>
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
