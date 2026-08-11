const API_BASE = '/api';

async function apiCall(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({ error: 'Unexpected server response.' }));

  if (!response.ok) {
    const err = new Error(data.error || 'Request failed.');
    (err as any).code = data.code;
    (err as any).status = response.status;
    throw err;
  }

  return data;
}

export async function registerUser(email: string, password: string) {
  return apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(email: string, password: string) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutUser() {
  return apiCall('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser() {
  return apiCall('/auth/me');
}
