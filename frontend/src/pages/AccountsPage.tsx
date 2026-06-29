import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";

export function AccountsPage() {
  return (
    <>
      <PageHeader
        title="Accounts"
        description="Connect publishing destinations when OAuth is enabled."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {["YouTube", "VK", "Instagram", "Threads", "TikTok", "Pinterest"].map(
          (platform) => (
            <section
              key={platform}
              className="rounded-md border border-border p-4"
            >
              <h2 className="text-sm font-semibold">{platform}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Not connected
              </p>
              <Button className="mt-4 w-full" type="button" variant="outline">
                Connect
              </Button>
            </section>
          ),
        )}
      </div>
    </>
  );
}
