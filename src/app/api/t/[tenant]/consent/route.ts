import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/ip";
import { auditLog } from "@/lib/audit";
import crypto from "crypto";

type ConsentCategories = {
  necessary?: boolean;
  analytics?: boolean;
  marketing?: boolean;
};

type Body = {
  state?: "accepted" | "rejected" | "custom" | "unset";
  categories?: ConsentCategories | null;
  source?: string;
  path?: string;
  referrer?: string;
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function anonymizeIp(ip: string) {
  // Basic MVP anonymization: mask the last segment for IPv4.
  const m = ip.match(/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\.[0-9]{1,3}$/);
  if (m) return `${m[1]}.0`;
  return ip; // IPv6/unknown: keep as-is (can be improved later)
}

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const state = body.state;
  if (state !== "accepted" && state !== "rejected" && state !== "custom" && state !== "unset") {
    return NextResponse.json({ ok: false, error: "invalid_state" }, { status: 400 });
  }

  const t = await prisma.tenant.findUnique({ where: { slug: tenant }, select: { id: true, slug: true } });
  if (!t) return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });

  const ipRaw = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";
  const ip = ipRaw && ipRaw !== "unknown" ? anonymizeIp(ipRaw) : null;
  const ipHash = ipRaw && ipRaw !== "unknown" ? sha256(ipRaw) : null;
  const deviceHash = ua ? sha256(ua) : null;

  const categories = {
    necessary: true,
    analytics: !!body.categories?.analytics,
    marketing: !!body.categories?.marketing,
  };

  const action =
    state === "accepted"
      ? "legal.consent.accepted"
      : state === "rejected"
        ? "legal.consent.rejected"
        : state === "custom"
          ? "legal.consent.custom"
          : "legal.consent.reset";

  await auditLog({
    tenantId: t.id,
    actorUserId: null,
    action,
    targetType: "PUBLIC_SITE",
    targetId: t.slug,
    ip,
    userAgent: ua || null,
    metaJson: {
      scope: "PUBLIC",
      state,
      categories,
      source: body.source ?? "cookie_banner",
      path: body.path ?? null,
      referrer: body.referrer ?? req.headers.get("referer") ?? null,
      ipHash,
      deviceHash,
    },
  });

  return NextResponse.json({ ok: true });
}
