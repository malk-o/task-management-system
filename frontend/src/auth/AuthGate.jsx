import './auth.css';
import { useAuth } from './AuthContext.jsx';
import AuthPage from './AuthPage.jsx';

/** Shows the login page until someone is signed in, then shows the app. */
export default function AuthGate({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <div className="auth-loading">Loading…</div>;
  if (status === 'anonymous') return <AuthPage />;
  return children;
}
