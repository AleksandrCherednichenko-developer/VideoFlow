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
  isBootstrapping: boolean;
  hasBootstrapped: boolean;
  isRefreshing: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  bootstrapSession: () => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

let bootstrapSessionPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isBootstrapping: true,
  hasBootstrapped: false,
  isRefreshing: false,
  setSession: (accessToken, user) => {
    setSessionSnapshot(accessToken, user);
    set({
      accessToken,
      user,
      isBootstrapping: false,
      hasBootstrapped: true,
    });
  },
  clearSession: () => {
    clearSessionSnapshot();
    set({
      accessToken: null,
      user: null,
      isBootstrapping: false,
      hasBootstrapped: true,
      isRefreshing: false,
    });
  },
  bootstrapSession: () => {
    if (get().hasBootstrapped) {
      return Promise.resolve();
    }

    if (bootstrapSessionPromise !== null) {
      return bootstrapSessionPromise;
    }

    set({
      isBootstrapping: true,
    });

    bootstrapSessionPromise = (async () => {
      try {
        const session = await refreshSession();
        setSessionSnapshot(session.accessToken, session.user);
        set({
          accessToken: session.accessToken,
          user: session.user,
          isBootstrapping: false,
          hasBootstrapped: true,
        });
      } catch {
        clearSessionSnapshot();
        set({
          accessToken: null,
          user: null,
          isBootstrapping: false,
          hasBootstrapped: true,
        });
      } finally {
        bootstrapSessionPromise = null;
      }
    })();

    return bootstrapSessionPromise;
  },
  login: async (request) => {
    const session = await login(request);
    setSessionSnapshot(session.accessToken, session.user);
    set({
      accessToken: session.accessToken,
      user: session.user,
      isBootstrapping: false,
      hasBootstrapped: true,
    });
  },
  register: async (request) => {
    const session = await register(request);
    setSessionSnapshot(session.accessToken, session.user);
    set({
      accessToken: session.accessToken,
      user: session.user,
      isBootstrapping: false,
      hasBootstrapped: true,
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
        isBootstrapping: false,
        hasBootstrapped: true,
        isRefreshing: false,
      });
    } catch (error) {
      clearSessionSnapshot();
      set({
        accessToken: null,
        user: null,
        isBootstrapping: false,
        hasBootstrapped: true,
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
      isBootstrapping: false,
      hasBootstrapped: true,
    });
  },
}));
