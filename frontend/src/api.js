// Every call to the backend goes through this one function.
// The signed-in user is identified by a session token (see docs/AUTH.md). The `userId` argument is
// kept only so existing pages that call api(path, userId, ...) keep working unchanged.
const TOKEN_KEY = 'tm_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage not available */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage not available */ }
}

// Called when the server says the session is no longer valid (expired or signed out elsewhere).
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function api(path, userId, options = {}) { // eslint-disable-line no-unused-vars
  const token = getToken();
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      // response had no JSON body
    }
    const isAuthForm = path.startsWith('/auth/login') || path.startsWith('/auth/register');
    if (response.status === 401 && token && !isAuthForm) onUnauthorized();
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}
