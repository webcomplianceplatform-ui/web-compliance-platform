import Link from "next/link";

const TITLES: Record<string, string> = {
  tickets: "Tickets",
  intake: "Intake",
  legal: "Legal",
  monitoring: "Monitoring",
  security: "Security",
  web: "Web",
};

export default function ModuleLocked({
  tenant,
  module,
}: {
  tenant: string;
  module: "tickets" | "intake" | "legal" | "monitoring" | "security" | "web";
}) {
  const title = TITLES[module] ?? "This module";

  return (
    <main className="mx-auto max-w-2xl space-y-4">
      <div className="glass rounded-2xl p-6">
        <div className="text-xs text-muted-foreground">Feature not enabled</div>
        <h1 className="mt-2 text-2xl font-semibold">{title} is not included in your plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This tenant (<span className="font-mono">{tenant}</span>) doesn’t have access to <b>{title}</b>. If you need
          it, upgrade your plan or ask an owner/admin to enable it.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={`/app/${tenant}`} className="inline-flex rounded-xl border bg-bg2/60 px-4 py-2 text-sm hover:bg-bg2/80">
            Back to overview
          </Link>
          <Link href={`/app/${tenant}/settings`} className="inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-medium text-black hover:opacity-95">
            Manage plan / contact
          </Link>
        </div>
      </div>
    </main>
  );
}
