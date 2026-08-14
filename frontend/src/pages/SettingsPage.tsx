import { PageHeader } from "../components/layout/PageHeader";
import { Input } from "../components/ui/input";

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage scheduling preferences."
      />
      <section className="max-w-xl space-y-4 rounded-md border border-border p-5">
        <label className="block space-y-2 text-sm font-medium">
          <span>Timezone</span>
          <Input defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        </label>
      </section>
    </>
  );
}
