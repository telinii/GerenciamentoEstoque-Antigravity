import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'USER';

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  USER: 1,
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  // Helpers de permissão
  hasRole: (minimum: Role) => boolean;
  canManageEmployee: (targetRole: Role) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),

      // Retorna true se o usuário tem ao menos o role mínimo
      hasRole: (minimum: Role) => {
        const user = get().user;
        if (!user) return false;
        return (ROLE_HIERARCHY[user.role] || 0) >= ROLE_HIERARCHY[minimum];
      },

      // Retorna true se o usuário pode gerenciar um funcionário com o role alvo
      canManageEmployee: (targetRole: Role) => {
        const user = get().user;
        if (!user) return false;
        return (ROLE_HIERARCHY[user.role] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
      },
    }),
    { name: 'auth-storage' }
  )
);
