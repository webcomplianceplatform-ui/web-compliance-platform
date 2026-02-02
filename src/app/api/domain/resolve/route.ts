import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api-helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

const HostSchema = z.string().min(1).max(253);

function normalizeHost(host: string) {
  let h = host.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, "");
  h = h.split("/")[0] ?? "";
  h = h.replace(/:\d+$/, "");
  if (h.endsWith(".")) h = h.slice(0, -1);
  // Treat www as same domain
  if (h.startsWith("www.")) h = h.slice(4);
  return h;
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
const rl = rateLimit({ key: `domain:resolve:${ip}`, limit: 120, windowMs: 60_000 });
if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const url = new URL(req.url);
  const rawHost = url.searchParams.get("host") ?? "";

  const parsed = HostSchema.safeParse(rawHost);
  if (!parsed.success) return jsonError("bad_host", 400);

  const host = normalizeHost(parsed.data);
  if (!host || host.includes("localhost")) return jsonOk({ tenant: null });

  const t = await prisma.tenant.findFirst({
    where: {
      customDomain: host,
      customDomainVerifiedAt: { not: null },
    },
    select: { slug: true },
  });

  return jsonOk({ tenant: t?.slug ?? null });
}
