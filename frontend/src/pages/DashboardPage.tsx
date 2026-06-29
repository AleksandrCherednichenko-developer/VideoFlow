import { ArrowRight, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "../components/layout/PageHeader";
import { StatGrid } from "../components/layout/StatGrid";
import { Button } from "../components/ui/button";

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quiet command center for upcoming video publications."
      />

      <StatGrid
        items={[
          { label: "Scheduled", value: "0" },
          { label: "Publishing", value: "0" },
          { label: "Published", value: "0" },
          { label: "Failed", value: "0" },
        ]}
      />

      <section className="mt-6 rounded-md border border-border p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Next publication</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No scheduled publications yet.
            </p>
          </div>
          <Button asChild>
            <Link to="/create">
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Create
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
