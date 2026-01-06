import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireSuperadminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !isSuperadminEmail(email)) notFound();
  return { email };
}
/**
 * SUPERADMIN is intentionally separate from tenant roles.
 * MVP approach: an env-driven allowlist.
 */
export function getSuperadminEmails(): string[] {
  // dotenv usually strips quotes, but we handle them defensively.
  const raw = (process.env.SUPERADMIN_EMAILS ?? "").replace(/^"|"$/g, "");
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = getSuperadminEmails();
  if (allow.length === 0) return false;
  return allow.includes(email.trim().toLowerCase());
}
