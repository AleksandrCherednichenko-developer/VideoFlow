import { Share, SquarePlus } from "lucide-react";

import { PageHeader } from "../components/layout/PageHeader";

export function InstallPage() {
  return (
    <>
      <PageHeader
        title="Install"
        description="Add VideoFlow to the iPhone or iPad Home Screen."
      />
      <section className="max-w-2xl rounded-md border border-border p-5">
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Open VideoFlow in Safari and tap Share.</span>
          </li>
          <li className="flex gap-3">
            <SquarePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Choose Add to Home Screen.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-primary text-[10px] font-semibold text-primary-foreground">
              3
            </span>
            <span>Open VideoFlow from the Home Screen icon.</span>
          </li>
        </ol>
      </section>
    </>
  );
}
