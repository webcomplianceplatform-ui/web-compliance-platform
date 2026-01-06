"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold">The app hit an error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again. If it keeps happening, share the digest with your admin/support.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="rounded bg-black px-3 py-2 text-sm text-white"
            onClick={() => reset()}
          >
            Retry
          </button>
          {error?.digest ? (
            <span className="text-xs text-muted-foreground">
              Digest: <span className="font-mono">{error.digest}</span>
            </span>
          ) : null}
        </div>
      </div>
    </main>
  );
}
