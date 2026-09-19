import type { Role } from '../store/auth.store';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actor: { id: string; name: string; email: string; role: string };
  action: string;
  targetId?: string;
  targetEmail?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

const BASE = '/api/employees';

const handleResponse = async (res: Response) => {
  let data: any = {};
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : `Erro na requisição (${res.status})`);
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }

  return data;
};

export const employeeApi = {
  list: (): Promise<{ employees: Employee[] }> =>
    fetch(BASE, { credentials: 'include' }).then(handleResponse),

  getById: (id: string): Promise<{ employee: Employee }> =>
    fetch(`${BASE}/${id}`, { credentials: 'include' }).then(handleResponse),

  create: (payload: CreateEmployeePayload): Promise<{ employee: Employee }> =>
    fetch(BASE, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handleResponse),

  update: (id: string, payload: UpdateEmployeePayload): Promise<{ employee: Employee }> =>
    fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handleResponse),

  delete: (id: string): Promise<{ message: string }> =>
    fetch(`${BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse),

  getAuditLog: (
    page = 1,
    limit = 50
  ): Promise<{ logs: AuditLogEntry[]; total: number; page: number; pages: number }> =>
    fetch(`${BASE}/audit-log?page=${page}&limit=${limit}`, {
      credentials: 'include',
    }).then(handleResponse),
};
