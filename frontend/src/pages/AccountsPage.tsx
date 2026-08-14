import { Plug, Unplug } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import {
  ACCOUNT_PLATFORM,
  connectVkCommunity,
  disconnectAccount,
  listAccounts,
  startOAuth,
  type AccountPlatform,
} from "../api/accountsApi";
import { getApiErrorMessage } from "../api/errorMessage";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import {
  ACCOUNT_CONNECTION_METHOD,
  buildAccountPlatformCards,
  formatAccountExpiry,
  getAccountPlatformLabel,
} from "./accountsViewModel";

function getOAuthNotice(searchParams: URLSearchParams): string | null {
  const oauthStatus = searchParams.get("oauth");
  const platform = searchParams.get("platform") as AccountPlatform | null;

  if (oauthStatus === null || platform === null) {
    return null;
  }

  const platformLabel = getAccountPlatformLabel(platform);

  if (oauthStatus === "connected") {
    return `${platformLabel} account connected.`;
  }

  const code = searchParams.get("code");

  return `Could not connect ${platformLabel}${code !== null ? ` (${code})` : ""}.`;
}

export function AccountsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [vkGroupId, setVkGroupId] = useState("");
  const [vkAccessToken, setVkAccessToken] = useState("");
  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: listAccounts,
  });
  const cards = useMemo(
    () => buildAccountPlatformCards(accountsQuery.data?.accounts ?? []),
    [accountsQuery.data?.accounts],
  );
  const oauthNotice = getOAuthNotice(searchParams);
  const connectMutation = useMutation({
    mutationFn: startOAuth,
    onSuccess: (response) => {
      window.location.assign(response.authorizationUrl);
    },
  });
  const connectVkMutation = useMutation({
    mutationFn: connectVkCommunity,
    onSuccess: async () => {
      setVkGroupId("");
      setVkAccessToken("");
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
  const disconnectMutation = useMutation({
    mutationFn: disconnectAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Connect publishing destinations when OAuth is enabled."
      />

      {oauthNotice !== null ? (
        <section
          aria-live="polite"
          className="mb-4 rounded-md border border-border bg-muted px-4 py-3 text-sm"
        >
          {oauthNotice}
        </section>
      ) : null}

      {accountsQuery.isLoading ? (
        <section className="rounded-md border border-border p-5 text-sm text-muted-foreground">
          Loading accounts...
        </section>
      ) : null}

      {accountsQuery.isError ? (
        <section className="rounded-md border border-border p-5 text-sm text-destructive">
          {getApiErrorMessage(accountsQuery.error, "Could not load accounts.")}
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <section
            key={card.platform}
            className="rounded-md border border-border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{card.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {card.account === null
                    ? card.isConnectable
                      ? "Not connected"
                      : "Coming later"
                    : card.account.externalAccountName ??
                      card.account.externalAccountId ??
                      "Connected account"}
                </p>
              </div>
              <span
                className={[
                  "rounded-md px-2 py-1 text-xs font-medium",
                  card.account === null
                    ? "bg-muted text-muted-foreground"
                    : card.account.isExpired
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground",
                ].join(" ")}
              >
                {card.account === null
                  ? card.isConnectable
                    ? "Available"
                    : "Later"
                  : card.account.isExpired
                    ? "Expired"
                    : "Connected"}
              </span>
            </div>

            {card.account !== null ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Token expiry</dt>
                  <dd>{formatAccountExpiry(card.account.expiresAt)}</dd>
                </div>
                {card.account.externalAccountId !== null ? (
                  <div>
                    <dt className="text-muted-foreground">External ID</dt>
                    <dd className="break-all">{card.account.externalAccountId}</dd>
                  </div>
                ) : null}
                {card.platform === ACCOUNT_PLATFORM.VK ? (
                  <div>
                    <dt className="text-muted-foreground">Publish mode</dt>
                    <dd>Link post (native video pending VK approval)</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {card.isConnectable ? (
              card.account === null ? (
                card.connectionMethod === ACCOUNT_CONNECTION_METHOD.MANUAL_VK ? (
                  <form
                    className="mt-4 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      connectVkMutation.mutate({
                        groupId: vkGroupId,
                        accessToken: vkAccessToken,
                      });
                    }}
                  >
                    <p className="text-xs text-muted-foreground">
                      In your VK community: Settings → API → create a community
                      access token with wall and photos/video/files permissions.
                    </p>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">Group ID</span>
                      <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        name="vkGroupId"
                        required
                        value={vkGroupId}
                        onChange={(event) => setVkGroupId(event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">
                        Community access token
                      </span>
                      <input
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        name="vkAccessToken"
                        required
                        type="password"
                        value={vkAccessToken}
                        onChange={(event) => setVkAccessToken(event.target.value)}
                      />
                    </label>
                    <Button
                      className="w-full"
                      disabled={connectVkMutation.isPending}
                      type="submit"
                      variant="outline"
                    >
                      <Plug className="h-4 w-4" aria-hidden="true" />
                      Connect community
                    </Button>
                  </form>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    disabled={connectMutation.isPending}
                    type="button"
                    variant="outline"
                    onClick={() => connectMutation.mutate(card.platform)}
                  >
                    <Plug className="h-4 w-4" aria-hidden="true" />
                    Connect
                  </Button>
                )
              ) : (
                <Button
                  className="mt-4 w-full"
                  disabled={disconnectMutation.isPending}
                  type="button"
                  variant="outline"
                  onClick={() => disconnectMutation.mutate(card.platform)}
                >
                  <Unplug className="h-4 w-4" aria-hidden="true" />
                  Disconnect
                </Button>
              )
            ) : (
              <Button className="mt-4 w-full" disabled type="button" variant="outline">
                Coming later
              </Button>
            )}
          </section>
        ))}
      </div>

      {connectMutation.isError ? (
        <p className="mt-4 text-sm text-destructive">
          {getApiErrorMessage(connectMutation.error, "Could not start OAuth.")}
        </p>
      ) : null}

      {connectVkMutation.isError ? (
        <p className="mt-4 text-sm text-destructive">
          {getApiErrorMessage(
            connectVkMutation.error,
            "Could not connect VK community.",
          )}
        </p>
      ) : null}

      {disconnectMutation.isError ? (
        <p className="mt-4 text-sm text-destructive">
          {getApiErrorMessage(
            disconnectMutation.error,
            "Could not disconnect account.",
          )}
        </p>
      ) : null}
    </>
  );
}
