import { ArrowLeft, CalendarClock, ExternalLink, RotateCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPublication, retryPublication } from "../api/publicationApi";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { getApiErrorMessage } from "../api/errorMessage";
import {
  buildPlatformStatusRows,
  formatPublicationDateTime,
  getEnabledPlatforms,
  getPlatformLabel,
  isPublicationRetryable,
  PUBLICATIONS_REFETCH_INTERVAL_MS,
} from "./publicationViewModel";

export function PublicationDetailsPage() {
  const params = useParams();
  const publicationId = params.id;
  const queryClient = useQueryClient();
  const publicationQuery = useQuery({
    enabled: publicationId !== undefined,
    queryKey: ["publication", publicationId],
    queryFn: async () => {
      if (publicationId === undefined) {
        throw new Error("Missing publication id.");
      }

      return getPublication(publicationId);
    },
    refetchInterval: PUBLICATIONS_REFETCH_INTERVAL_MS,
  });
  const retryMutation = useMutation({
    mutationFn: async () => {
      if (publicationId === undefined) {
        throw new Error("Missing publication id.");
      }

      return retryPublication(publicationId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["publication", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["publications"] }),
      ]);
    },
  });
  const publication = publicationQuery.data?.publication;

  return (
    <>
      <PageHeader
        title="Publication"
        description="Status, platform results, and retry controls for this publishing job."
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/create">Create another</Link>
        </Button>
      </div>

      {publicationQuery.isLoading ? (
        <section className="rounded-md border border-border p-5 text-sm text-muted-foreground">
          Loading publication...
        </section>
      ) : null}

      {publicationQuery.isError ? (
        <section className="rounded-md border border-border p-5">
          <div className="flex items-start gap-3">
            <RotateCw className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold">Could not load publication</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {getApiErrorMessage(
                  publicationQuery.error,
                  "Refresh the page and try again.",
                )}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {publication !== undefined ? (
        <section className="rounded-md border border-border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <h2 className="mt-1 text-xl font-semibold capitalize">
                {publication.status}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {isPublicationRetryable(publication) ? (
                <Button
                  disabled={retryMutation.isPending}
                  type="button"
                  variant="outline"
                  onClick={() => retryMutation.mutate()}
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  {retryMutation.isPending ? "Retrying..." : "Retry"}
                </Button>
              ) : null}
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {publication.id}
              </div>
            </div>
          </div>

          {retryMutation.isError ? (
            <p className="mt-4 text-sm text-destructive">
              {getApiErrorMessage(
                retryMutation.error,
                "Could not retry publication.",
              )}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Scheduled
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatPublicationDateTime(publication.scheduledAt)}
              </p>
            </div>

            <div className="rounded-md border border-border p-4">
              <p className="text-sm font-medium">Platforms</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {getEnabledPlatforms(publication).map((platform) => (
                  <span
                    className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground"
                    key={platform}
                  >
                    {getPlatformLabel(platform)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium">Platform status</p>
            </div>
            <div className="divide-y divide-border">
              {buildPlatformStatusRows(publication).map((row) => (
                <div
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  key={row.platform}
                >
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="mt-1 text-sm capitalize text-muted-foreground">
                      {row.status}
                    </p>
                    {row.errorMessage !== null ? (
                      <p className="mt-2 text-sm text-destructive">
                        {row.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  {row.resultUrl !== null ? (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={row.resultUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open result
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border p-4">
            <p className="text-sm font-medium">Default text</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {publication.defaultText}
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
