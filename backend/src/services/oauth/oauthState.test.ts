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
    const state = createOAuthState(userId, PLATFORM.YOUTUBE);
    const payload = verifyOAuthState(state, PLATFORM.YOUTUBE);

    expect(payload).toMatchObject({
      userId,
      platform: PLATFORM.YOUTUBE,
    });
    expect(payload.nonce).toHaveLength(36);
  });

  it("rejects tampered state", () => {
    const state = createOAuthState(userId, PLATFORM.YOUTUBE);

    expect(() => verifyOAuthState(`${state}x`, PLATFORM.YOUTUBE)).toThrow(
      "Invalid OAuth state",
    );
  });

  it("rejects state for another platform", () => {
    const state = createOAuthState(userId, PLATFORM.YOUTUBE);

    expect(() => verifyOAuthState(state, PLATFORM.INSTAGRAM)).toThrow(
      "Invalid OAuth state",
    );
  });

  it("rejects expired state", () => {
    const state = createOAuthState(userId, PLATFORM.YOUTUBE);

    vi.setSystemTime(new Date("2026-06-30T10:11:00.000Z"));

    expect(() => verifyOAuthState(state, PLATFORM.YOUTUBE)).toThrow(
      "OAuth state expired",
    );
  });
});
