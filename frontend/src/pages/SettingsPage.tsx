import { PageHeader } from "../components/layout/PageHeader";
import { Input } from "../components/ui/input";

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage account preferences for scheduling and notifications."
      />
      <section className="max-w-xl space-y-4 rounded-md border border-border p-5">
        <label className="block space-y-2 text-sm font-medium">
          <span>Timezone</span>
          <Input defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm">
          <span>Email notifications</span>
          <input className="h-4 w-4 accent-teal-700" defaultChecked type="checkbox" />
        </label>
      </section>
    </>
  );
}
