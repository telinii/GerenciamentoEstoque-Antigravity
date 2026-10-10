import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (v: boolean) => void;
  logout: () => void;
  hasRole: (minimum: Role) => boolean;
  canManageEmployee: (targetRole: Role) => boolean;
  initAuthListener: () => () => void; // retorna o unsubscribe
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false }),

      hasRole: (minimum: Role) => {
        const user = get().user;
        if (!user) return false;
        return (ROLE_HIERARCHY[user.role] || 0) >= ROLE_HIERARCHY[minimum];
      },

      canManageEmployee: (targetRole: Role) => {
        const user = get().user;
        if (!user) return false;
        return (ROLE_HIERARCHY[user.role] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
      },

      initAuthListener: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          try {
            // Busca perfil no Firestore
            const userRef = doc(db, 'users', firebaseUser.uid);
            const snap = await getDoc(userRef);

            if (snap.exists()) {
              const data = snap.data();
              if (!data.isActive) {
                // Conta desativada — faz logout silencioso
                await auth.signOut();
                set({ user: null, isAuthenticated: false, isLoading: false });
                return;
              }
              set({
                user: {
                  id: firebaseUser.uid,
                  name: data.name || firebaseUser.displayName || 'Usuário',
                  email: firebaseUser.email || '',
                  role: (data.role as Role) || 'USER',
                  isActive: data.isActive ?? true,
                  isEmailVerified: firebaseUser.emailVerified,
                },
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              // Primeiro login Google: cria documento básico
              const newUser: AuthUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
                email: firebaseUser.email || '',
                role: 'USER',
                isActive: true,
                isEmailVerified: firebaseUser.emailVerified,
              };
              await setDoc(userRef, {
                name: newUser.name,
                email: newUser.email,
                role: 'USER',
                isActive: true,
                isEmailVerified: firebaseUser.emailVerified,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              set({ user: newUser, isAuthenticated: true, isLoading: false });
            }
          } catch (err) {
            console.error('Erro ao carregar perfil do usuário:', err);
            set({ isLoading: false });
          }
        });
        return unsubscribe;
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
