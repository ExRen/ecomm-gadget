'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import api from '@/lib/api';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (token) => {
        set({ accessToken: token });
        if (token) {
          localStorage.setItem('accessToken', token);
        } else {
          localStorage.removeItem('accessToken');
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const result = data.data || data;
          set({
            user: result.user,
            accessToken: result.accessToken,
            isAuthenticated: true,
          });
          localStorage.setItem('accessToken', result.accessToken);
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name, email, password, phone) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/register', { name, email, password, phone });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          // Ignore error
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
        localStorage.removeItem('accessToken');
      },

      fetchUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          const user = data.data?.user || data.user;
          set({ user, isAuthenticated: !!user });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      }
    },
  ),
);
