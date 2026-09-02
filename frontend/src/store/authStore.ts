import { create } from 'zustand';
import { apiClient } from '../lib/apiClient';

interface User {
  id: number;
  email: string;
  displayName?: string | null;
  tenantId: string;
  isAdmin?: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

// Single source of truth: localStorage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initialise from localStorage so state survives page refresh
  user: loadUser(),
  token: loadToken(),

  login: async (email, password) => {
    const { user, token } = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, token });
  },

  signup: async (email, password, displayName) => {
    const { user, token } = await apiClient.post<AuthResponse>('/api/auth/signup', { email, password, displayName });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!get().token,
}));
