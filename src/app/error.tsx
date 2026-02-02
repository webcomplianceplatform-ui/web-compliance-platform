"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border bg-bg1 p-6">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please try again. If it keeps happening, share the error digest with support.
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
