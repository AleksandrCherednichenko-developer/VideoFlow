import { PageHeader } from "../components/layout/PageHeader";

export function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        description="Review completed, partial, and failed publication runs."
      />
      <section className="rounded-md border border-border p-5 text-sm text-muted-foreground">
        Publication history will appear here.
      </section>
    </>
  );
}
