import type { AuthUser } from "./authApi";

interface SessionSnapshot {
  accessToken: string | null;
  user: AuthUser | null;
}

let sessionSnapshot: SessionSnapshot = {
  accessToken: null,
  user: null,
};

export function getAccessToken(): string | null {
  return sessionSnapshot.accessToken;
}

export function setSessionSnapshot(accessToken: string, user: AuthUser): void {
  sessionSnapshot = {
    accessToken,
    user,
  };
}

export function clearSessionSnapshot(): void {
  sessionSnapshot = {
    accessToken: null,
    user: null,
  };
}
