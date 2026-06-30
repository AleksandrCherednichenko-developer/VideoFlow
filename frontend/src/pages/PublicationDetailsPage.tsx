import { ArrowLeft, CalendarClock, RotateCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getPublication, type PublicationPlatformPayload } from "../api/publicationApi";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { getApiErrorMessage } from "../api/errorMessage";

function formatScheduledAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPlatformLabel(platform: PublicationPlatformPayload["platform"]): string {
  if (platform === "youtube") {
    return "YouTube";
  }

  return "VK";
}

export function PublicationDetailsPage() {
  const params = useParams();
  const publicationId = params.id;
  const publicationQuery = useQuery({
    enabled: publicationId !== undefined,
    queryKey: ["publication", publicationId],
    queryFn: async () => {
      if (publicationId === undefined) {
        throw new Error("Missing publication id.");
      }

      return getPublication(publicationId);
    },
  });

  return (
    <>
      <PageHeader
        title="Publication"
        description="A minimal confirmation view for the scheduled publishing job."
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

      {publicationQuery.data !== undefined ? (
        <section className="rounded-md border border-border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <h2 className="mt-1 text-xl font-semibold capitalize">
                {publicationQuery.data.publication.status}
              </h2>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {publicationQuery.data.publication.id}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Scheduled
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatScheduledAt(publicationQuery.data.publication.scheduledAt)}
              </p>
            </div>

            <div className="rounded-md border border-border p-4">
              <p className="text-sm font-medium">Platforms</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {publicationQuery.data.publication.platforms
                  .filter((platformSettings) => platformSettings.enabled)
                  .map((platformSettings) => (
                    <span
                      className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground"
                      key={platformSettings.platform}
                    >
                      {getPlatformLabel(platformSettings.platform)}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border p-4">
            <p className="text-sm font-medium">Default text</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {publicationQuery.data.publication.defaultText}
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
