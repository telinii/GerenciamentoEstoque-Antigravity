import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Role } from '../store/auth.store';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  createdBy?: { id?: string; name?: string; email?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export interface UpdateEmployeePayload {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetId?: string | null;
  targetEmail?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export const employeeApi = {
  getEmployees: async (filters?: { search?: string; role?: string }): Promise<{ employees: Employee[] }> => {
    const snap = await getDocs(collection(db, 'users'));
    let employees = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Employee[];

    if (filters?.role && filters.role !== 'ALL') {
      employees = employees.filter((e) => e.role === filters.role);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      employees = employees.filter(
        (e) => e.name?.toLowerCase().includes(s) || e.email?.toLowerCase().includes(s)
      );
    }

    return { employees };
  },

  list: async (filters?: { search?: string; role?: string }): Promise<{ employees: Employee[] }> => {
    return employeeApi.getEmployees(filters);
  },

  getEmployee: async (id: string): Promise<{ employee: Employee }> => {
    const snap = await getDoc(doc(db, 'users', id));
    if (!snap.exists()) throw new Error('Funcionário não encontrado');
    return { employee: { id: snap.id, ...snap.data() } as Employee };
  },

  createEmployee: async (payload: CreateEmployeePayload): Promise<{ id: string; message: string }> => {
    const ref = await addDoc(collection(db, 'users'), {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: ref.id, message: 'Funcionário cadastrado no sistema' };
  },

  create: async (payload: CreateEmployeePayload): Promise<{ id: string; message: string }> => {
    return employeeApi.createEmployee(payload);
  },

  updateEmployee: async (id: string, payload: UpdateEmployeePayload): Promise<{ message: string }> => {
    await updateDoc(doc(db, 'users', id), {
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    return { message: 'Funcionário atualizado com sucesso' };
  },

  update: async (id: string, payload: UpdateEmployeePayload): Promise<{ message: string }> => {
    return employeeApi.updateEmployee(id, payload);
  },

  deleteEmployee: async (id: string): Promise<{ message: string }> => {
    await deleteDoc(doc(db, 'users', id));
    return { message: 'Funcionário removido' };
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return employeeApi.deleteEmployee(id);
  },

  getAuditLogs: async (page = 1, pageLimit = 20): Promise<{ logs: AuditLogEntry[]; meta: { total: number; pages: number } }> => {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(pageLimit * page));
    const snap = await getDocs(q);
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AuditLogEntry[];

    return {
      logs,
      meta: { total: logs.length, pages: Math.ceil(logs.length / pageLimit) || 1 },
    };
  },

  getAuditLog: async (page = 1, pageLimit = 20): Promise<{ logs: AuditLogEntry[]; meta: { total: number; pages: number } }> => {
    return employeeApi.getAuditLogs(page, pageLimit);
  },
};
