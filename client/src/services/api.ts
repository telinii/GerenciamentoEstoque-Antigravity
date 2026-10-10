const BASE_URL = 'http://localhost:3000/api';

const request = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Sends HttpOnly cookies automatically
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  firebaseLogin: (body: { email: string; name: string; uid: string }) =>
    request('/auth/firebase-login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  me: () =>
    request('/auth/me'),
};
