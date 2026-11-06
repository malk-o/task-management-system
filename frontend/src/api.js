// Every call to the backend goes through this one function.
// Beta authentication: the current user is sent in the X-User-Id header.
export async function api(path, userId, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': String(userId) } : {}),
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
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}
