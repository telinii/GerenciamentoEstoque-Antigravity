import { auth } from '../config/firebase';

// Em produção (Firebase Hosting) usa /api (rewrite do firebase.json)
// Em desenvolvimento usa o backend local ou emulator
const IS_DEV = import.meta.env.DEV;
export const API_BASE = IS_DEV
  ? 'http://localhost:3000/api'          // backend Express local (dev)
  : '/api';                              // Firebase Function via rewrite (prod)

// Pega o ID token do usuário logado via Firebase Auth
const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

// Helper de requisição autenticada
export const request = async (path: string, options?: RequestInit) => {
  const token = await getIdToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};
