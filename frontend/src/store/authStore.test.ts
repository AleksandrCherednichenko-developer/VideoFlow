import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAccessToken, setSessionSnapshot } from "../api/session";
import {
  login,
  logout,
  refreshSession,
  register,
  type AuthSessionResponse,
} from "../api/authApi";
import { useAuthStore } from "./authStore";

vi.mock("../api/authApi", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  register: vi.fn(),
}));

const TEST_SESSION: AuthSessionResponse = {
  accessToken: "access-token",
  user: {
    id: "user-id",
    email: "user@example.com",
    timezone: "UTC",
    emailNotificationsEnabled: true,
  },
};

function resetAuthStore(): void {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    isBootstrapping: true,
    hasBootstrapped: false,
    isRefreshing: false,
  });
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return {
    promise,
    resolve,
  };
}

describe("authStore", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    vi.mocked(logout).mockReset();
    vi.mocked(refreshSession).mockReset();
    vi.mocked(register).mockReset();
    resetAuthStore();
  });

  it("bootstraps a valid refresh-cookie session", async () => {
    vi.mocked(refreshSession).mockResolvedValueOnce(TEST_SESSION);

    await useAuthStore.getState().bootstrapSession();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: TEST_SESSION.accessToken,
      user: TEST_SESSION.user,
      isBootstrapping: false,
      hasBootstrapped: true,
    });
    expect(getAccessToken()).toBe(TEST_SESSION.accessToken);
  });

  it("finishes bootstrap as logged out when refresh fails", async () => {
    setSessionSnapshot("stale-token", TEST_SESSION.user);
    vi.mocked(refreshSession).mockRejectedValueOnce(new Error("Unauthorized"));

    await useAuthStore.getState().bootstrapSession();

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      user: null,
      isBootstrapping: false,
      hasBootstrapped: true,
    });
    expect(getAccessToken()).toBeNull();
  });

  it("deduplicates concurrent bootstrap calls", async () => {
    const deferredSession = createDeferred<AuthSessionResponse>();
    vi.mocked(refreshSession).mockReturnValueOnce(deferredSession.promise);

    const firstBootstrap = useAuthStore.getState().bootstrapSession();
    const secondBootstrap = useAuthStore.getState().bootstrapSession();

    deferredSession.resolve(TEST_SESSION);
    await Promise.all([firstBootstrap, secondBootstrap]);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe(TEST_SESSION.accessToken);
  });
});
