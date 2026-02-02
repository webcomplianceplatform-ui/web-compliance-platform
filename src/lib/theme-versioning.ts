import type { TenantTheme } from "@/lib/theme";

export type ThemeVersionEntry<T> = {
  at: string; // ISO timestamp
  actorEmail?: string;
  value: T;
};

function pushVersion<T>(arr: ThemeVersionEntry<T>[] | undefined, entry: ThemeVersionEntry<T>, max = 5) {
  const next = [entry, ...(arr ?? [])];
  if (next.length > max) next.length = max;
  return next;
}

function ensureHistory(theme: any) {
  if (!theme.__history) theme.__history = {};
  return theme.__history as Record<string, unknown>;
}

export function storeSiteBuilderVersion(theme: TenantTheme, prev: any, actorEmail?: string) {
  const t: any = { ...(theme as any) };
  const h: any = ensureHistory(t);
  h.siteBuilder = pushVersion(h.siteBuilder as any, { at: new Date().toISOString(), actorEmail, value: prev });
  t.__history = h;
  return t as TenantTheme;
}

export function storeLegalVersion(theme: TenantTheme, prev: { legal?: any; legalDocs?: any }, actorEmail?: string) {
  const t: any = { ...(theme as any) };
  const h: any = ensureHistory(t);
  h.legal = pushVersion(h.legal as any, { at: new Date().toISOString(), actorEmail, value: prev });
  t.__history = h;
  return t as TenantTheme;
}

export function storeSeoVersion(theme: TenantTheme, prev: any, actorEmail?: string) {
  const t: any = { ...(theme as any) };
  const h: any = ensureHistory(t);
  h.seo = pushVersion(h.seo as any, { at: new Date().toISOString(), actorEmail, value: prev });
  t.__history = h;
  return t as TenantTheme;
}
