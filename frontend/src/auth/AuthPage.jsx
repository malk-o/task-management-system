import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { BrandMark } from '../components/Icons.jsx';
import { useAuth } from './AuthContext.jsx';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(null);

  const isLogin = mode === 'login';

  // Development only: the server offers the seeded demo accounts so we can fill the form with one click.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    api('/auth/demo-accounts').then(setDemo).catch(() => setDemo(null));
  }, []);

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-brand">
        <BrandMark size={52} />
        <h1>Task &amp; Project Management</h1>
        <p>Create and assign tasks, follow progress, and keep your whole team in the loop.</p>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <h2>{isLogin ? 'Sign in' : 'Create your account'}</h2>
          <p className="auth-sub">
            {isLogin ? 'Welcome back. Enter your details to continue.' : 'Use your work email. A project manager can then add you to a project.'}
          </p>

          {!isLogin && (
            <label className="field">
              <span>Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
              />
              <button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {!isLogin && <small>At least 8 characters, with a letter and a number.</small>}
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>

          <p className="auth-switch">
            {isLogin ? 'No account yet?' : 'Already have an account?'}{' '}
            <button type="button" onClick={() => switchMode(isLogin ? 'register' : 'login')}>
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </form>

        {import.meta.env.DEV && isLogin && demo && (
          <div className="demo-box">
            <p>Beta demo accounts (shown in development only). Click one to fill the form.</p>
            <div className="demo-list">
              {demo.accounts.map((a) => (
                <button
                  type="button"
                  key={a.email}
                  onClick={() => { setEmail(a.email); setPassword(demo.password); setError(''); }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
