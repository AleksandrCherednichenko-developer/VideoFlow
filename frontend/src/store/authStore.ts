import { create } from "zustand";

import {
  login,
  logout,
  refreshSession,
  register,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from "../api/authApi";
import { clearSessionSnapshot, setSessionSnapshot } from "../api/session";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isRefreshing: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isRefreshing: false,
  setSession: (accessToken, user) => {
    setSessionSnapshot(accessToken, user);
    set({
      accessToken,
      user,
    });
  },
  clearSession: () => {
    clearSessionSnapshot();
    set({
      accessToken: null,
      user: null,
      isRefreshing: false,
    });
  },
  login: async (request) => {
    const session = await login(request);
    setSessionSnapshot(session.accessToken, session.user);
    set({
      accessToken: session.accessToken,
      user: session.user,
    });
  },
  register: async (request) => {
    const session = await register(request);
    setSessionSnapshot(session.accessToken, session.user);
    set({
      accessToken: session.accessToken,
      user: session.user,
    });
  },
  refresh: async () => {
    set({
      isRefreshing: true,
    });

    try {
      const session = await refreshSession();
      setSessionSnapshot(session.accessToken, session.user);
      set({
        accessToken: session.accessToken,
        user: session.user,
        isRefreshing: false,
      });
    } catch (error) {
      clearSessionSnapshot();
      set({
        accessToken: null,
        user: null,
        isRefreshing: false,
      });
      throw error;
    }
  },
  logout: async () => {
    await logout();
    clearSessionSnapshot();
    set({
      accessToken: null,
      user: null,
    });
  },
}));
