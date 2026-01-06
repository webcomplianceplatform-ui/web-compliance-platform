import { redirect } from "next/navigation";

export default async function LegacyAdminRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qs = new URLSearchParams();

  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "undefined") continue;
    if (Array.isArray(v)) {
      for (const item of v) qs.append(k, String(item));
    } else {
      qs.set(k, String(v));
    }
  }

  const suffix = qs.toString();
  redirect(suffix ? `/app/admin?${suffix}` : "/app/admin");
}
