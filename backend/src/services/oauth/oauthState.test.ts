import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PLATFORM } from "../../config/constants.js";
import { createOAuthState, verifyOAuthState } from "./oauthState.js";

const userId = "11111111-1111-4111-8111-111111111111";

describe("oauthState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("signs and verifies OAuth state", () => {
    const state = createOAuthState(userId, PLATFORM.VK);
    const payload = verifyOAuthState(state, PLATFORM.VK);

    expect(payload).toMatchObject({
      userId,
      platform: PLATFORM.VK,
    });
    expect(payload.nonce).toHaveLength(36);
  });

  it("rejects tampered state", () => {
    const state = createOAuthState(userId, PLATFORM.VK);

    expect(() => verifyOAuthState(`${state}x`, PLATFORM.VK)).toThrow(
      "Invalid OAuth state",
    );
  });

  it("rejects state for another platform", () => {
    const state = createOAuthState(userId, PLATFORM.VK);

    expect(() => verifyOAuthState(state, PLATFORM.YOUTUBE)).toThrow(
      "Invalid OAuth state",
    );
  });

  it("rejects expired state", () => {
    const state = createOAuthState(userId, PLATFORM.VK);

    vi.setSystemTime(new Date("2026-06-30T10:11:00.000Z"));

    expect(() => verifyOAuthState(state, PLATFORM.VK)).toThrow(
      "OAuth state expired",
    );
  });
});
