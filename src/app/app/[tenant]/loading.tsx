export default function LoadingTenant() {
  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-xl bg-muted" />
          <div className="h-4 w-80 rounded-xl bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-muted" />
          <div className="h-9 w-28 rounded-xl bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
      </div>

      <div className="h-72 rounded-2xl bg-muted" />
    </main>
  );
}
