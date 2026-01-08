export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 12_000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
