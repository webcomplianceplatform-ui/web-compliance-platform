export default function LoadingAppRoot() {
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="glass rounded-2xl p-4 md:p-6">
        <div className="space-y-4">
          <div className="h-8 w-56 rounded-xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-muted" />
            <div className="h-28 rounded-2xl bg-muted" />
            <div className="h-28 rounded-2xl bg-muted" />
          </div>
          <div className="h-64 rounded-2xl bg-muted" />
        </div>
      </div>
    </main>
  );
}
