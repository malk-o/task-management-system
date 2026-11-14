import { initials } from '../time.js';

// Describes the user's role from their project memberships (roles are per project).
function describeRole(memberships = []) {
  if (memberships.some((m) => m.role === 'MANAGER')) return 'Project manager';
  if (memberships.length > 0) return 'Team member';
  return 'No projects yet';
}

/** Bottom of the sidebar: who is signed in, their role, and the Sign out button. */
export default function AccountMenu({ user, onSignOut }) {
  return (
    <div className="account">
      <div className="account-row">
        <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
        <div className="account-who">
          <span className="account-name">{user.name}</span>
          <span className="account-label">{describeRole(user.memberships)}</span>
        </div>
      </div>
      <button type="button" className="signout" onClick={onSignOut}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Sign out
      </button>
    </div>
  );
}
