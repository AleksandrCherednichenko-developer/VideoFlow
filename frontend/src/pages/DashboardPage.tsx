import { ArrowRight, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "../api/errorMessage";
import { listPublications } from "../api/publicationApi";
import { PageHeader } from "../components/layout/PageHeader";
import { StatGrid } from "../components/layout/StatGrid";
import { Button } from "../components/ui/button";
import {
  buildStatusCounters,
  formatPublicationDateTime,
  getEnabledPlatforms,
  getNextScheduledPublication,
  getPlatformLabel,
  PUBLICATIONS_REFETCH_INTERVAL_MS,
} from "./publicationViewModel";

export function DashboardPage() {
  const publicationsQuery = useQuery({
    queryKey: ["publications"],
    queryFn: listPublications,
    refetchInterval: PUBLICATIONS_REFETCH_INTERVAL_MS,
  });
  const publications = publicationsQuery.data?.publications ?? [];
  const nextPublication = getNextScheduledPublication(publications);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quiet command center for upcoming video publications."
      />

      <StatGrid
        items={buildStatusCounters(publications)}
      />

      <section className="mt-6 rounded-md border border-border p-5">
        {publicationsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading publications...</p>
        ) : null}

        {publicationsQuery.isError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(
              publicationsQuery.error,
              "Could not load publications.",
            )}
          </p>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Next publication</h2>
            {nextPublication === null ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No scheduled publications yet.
              </p>
            ) : (
              <div className="mt-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {formatPublicationDateTime(nextPublication.scheduledAt)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {getEnabledPlatforms(nextPublication).map((platform) => (
                    <span
                      className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                      key={platform}
                    >
                      {getPlatformLabel(platform)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {nextPublication !== null ? (
              <Button asChild variant="outline">
                <Link to={`/publication/${nextPublication.id}`}>
                  Details
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link to="/create">
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Create
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
