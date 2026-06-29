import { PageHeader } from "../components/layout/PageHeader";

export function SchedulePage() {
  return (
    <>
      <PageHeader
        title="Schedule"
        description="Calendar-ready list of planned publications."
      />
      <section className="rounded-md border border-border p-5 text-sm text-muted-foreground">
        No scheduled publications.
      </section>
    </>
  );
}
