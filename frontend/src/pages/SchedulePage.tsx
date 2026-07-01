import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "../api/errorMessage";
import { listPublications } from "../api/publicationApi";
import { PageHeader } from "../components/layout/PageHeader";
import {
  formatPublicationDateTime,
  getEnabledPlatforms,
  getFutureScheduledPublications,
  getPlatformLabel,
  PUBLICATIONS_REFETCH_INTERVAL_MS,
} from "./publicationViewModel";

export function SchedulePage() {
  const publicationsQuery = useQuery({
    queryKey: ["publications"],
    queryFn: listPublications,
    refetchInterval: PUBLICATIONS_REFETCH_INTERVAL_MS,
  });
  const scheduledPublications = getFutureScheduledPublications(
    publicationsQuery.data?.publications ?? [],
  );

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Calendar-ready list of planned publications."
      />

      <section className="rounded-md border border-border p-5">
        {publicationsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading scheduled publications...
          </p>
        ) : null}

        {publicationsQuery.isError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(
              publicationsQuery.error,
              "Could not load scheduled publications.",
            )}
          </p>
        ) : null}

        {!publicationsQuery.isLoading && scheduledPublications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scheduled publications.
          </p>
        ) : null}

        <div className="divide-y divide-border">
          {scheduledPublications.map((publication) => (
            <Link
              className="flex flex-col gap-3 py-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-start sm:justify-between sm:px-3"
              key={publication.id}
              to={`/publication/${publication.id}`}
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatPublicationDateTime(publication.scheduledAt)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {publication.defaultText}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                {getEnabledPlatforms(publication).map((platform) => (
                  <span
                    className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                    key={platform}
                  >
                    {getPlatformLabel(platform)}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
