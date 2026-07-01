import { afterEach, describe, expect, it } from "vitest";

import { env } from "../../config/env.js";
import { youtubeProvider } from "./oauthProviders.js";

const ORIGINAL_YOUTUBE_ENV = {
  YOUTUBE_CLIENT_ID: env.YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET: env.YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REDIRECT_URL: env.YOUTUBE_REDIRECT_URL,
};

function setYouTubeEnv(values: {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}): void {
  env.YOUTUBE_CLIENT_ID = values.clientId;
  env.YOUTUBE_CLIENT_SECRET = values.clientSecret;
  env.YOUTUBE_REDIRECT_URL = values.redirectUrl;
}

describe("oauthProviders", () => {
  afterEach(() => {
    env.YOUTUBE_CLIENT_ID = ORIGINAL_YOUTUBE_ENV.YOUTUBE_CLIENT_ID;
    env.YOUTUBE_CLIENT_SECRET = ORIGINAL_YOUTUBE_ENV.YOUTUBE_CLIENT_SECRET;
    env.YOUTUBE_REDIRECT_URL = ORIGINAL_YOUTUBE_ENV.YOUTUBE_REDIRECT_URL;
  });

  it("treats missing YouTube config as unconfigured", () => {
    setYouTubeEnv({
      clientId: "",
      clientSecret: "",
      redirectUrl: "",
    });

    expect(youtubeProvider.isConfigured()).toBe(false);
  });

  it("builds YouTube authorization URLs with offline access", () => {
    setYouTubeEnv({
      clientId: "youtube-client-id",
      clientSecret: "youtube-client-secret",
      redirectUrl: "http://localhost:3000/oauth/youtube/callback",
    });

    const url = new URL(youtubeProvider.buildAuthorizationUrl("signed-state"));

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe("youtube-client-id");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("include_granted_scopes")).toBe("true");
    expect(url.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/youtube.upload",
    );
  });
});
