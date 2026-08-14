import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "../api/errorMessage";
import { listPublications } from "../api/publicationApi";
import { PageHeader } from "../components/layout/PageHeader";
import {
  filterPublications,
  formatPublicationDateTime,
  getEnabledPlatforms,
  getPlatformLabel,
  getPublicationStatusLabel,
  PLATFORM_FILTER,
  PUBLICATIONS_REFETCH_INTERVAL_MS,
  PUBLICATION_STATUS_FILTER,
  type PlatformFilter,
  type PublicationStatusFilter,
} from "./publicationViewModel";

const STATUS_FILTER_OPTIONS = [
  PUBLICATION_STATUS_FILTER.ALL,
  PUBLICATION_STATUS_FILTER.SCHEDULED,
  PUBLICATION_STATUS_FILTER.PUBLISHING,
  PUBLICATION_STATUS_FILTER.PUBLISHED,
  PUBLICATION_STATUS_FILTER.PARTIAL,
  PUBLICATION_STATUS_FILTER.FAILED,
] as const;

const PLATFORM_FILTER_OPTIONS = [
  PLATFORM_FILTER.ALL,
  PLATFORM_FILTER.YOUTUBE,
  PLATFORM_FILTER.INSTAGRAM,
  PLATFORM_FILTER.TIKTOK,
] as const;

export function HistoryPage() {
  const [statusFilter, setStatusFilter] = useState<PublicationStatusFilter>(
    PUBLICATION_STATUS_FILTER.ALL,
  );
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(
    PLATFORM_FILTER.ALL,
  );
  const publicationsQuery = useQuery({
    queryKey: ["publications"],
    queryFn: listPublications,
    refetchInterval: PUBLICATIONS_REFETCH_INTERVAL_MS,
  });
  const publications = publicationsQuery.data?.publications ?? [];
  const filteredPublications = useMemo(
    () => filterPublications(publications, statusFilter, platformFilter),
    [platformFilter, publications, statusFilter],
  );

  return (
    <>
      <PageHeader
        title="History"
        description="Review completed, partial, and failed publication runs."
      />

      <section className="rounded-md border border-border p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Status
            <select
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as PublicationStatusFilter)
              }
            >
              {STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === PUBLICATION_STATUS_FILTER.ALL
                    ? "All statuses"
                    : getPublicationStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Platform
            <select
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={platformFilter}
              onChange={(event) =>
                setPlatformFilter(event.target.value as PlatformFilter)
              }
            >
              {PLATFORM_FILTER_OPTIONS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform === PLATFORM_FILTER.ALL
                    ? "All platforms"
                    : getPlatformLabel(platform)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {publicationsQuery.isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Loading publication history...
          </p>
        ) : null}

        {publicationsQuery.isError ? (
          <p className="mt-5 text-sm text-destructive">
            {getApiErrorMessage(
              publicationsQuery.error,
              "Could not load publication history.",
            )}
          </p>
        ) : null}

        {!publicationsQuery.isLoading && filteredPublications.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No publications match the selected filters.
          </p>
        ) : null}

        <div className="mt-5 divide-y divide-border">
          {filteredPublications.map((publication) => (
            <Link
              className="block py-4 transition-colors hover:bg-muted/50 sm:px-3"
              key={publication.id}
              to={`/publication/${publication.id}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatPublicationDateTime(publication.scheduledAt)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {publication.defaultText}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
                    {publication.status}
                  </span>
                  {getEnabledPlatforms(publication).map((platform) => (
                    <span
                      className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                      key={platform}
                    >
                      {getPlatformLabel(platform)}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
