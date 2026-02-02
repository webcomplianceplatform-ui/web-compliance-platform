import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// CSP violation report endpoint (Report-Only mode).
// Accepts browser reports and stores them as global AuditEvent for triage.

export async function POST(req: Request) {
  const bodyText = await req.text().catch(() => "");
  let payload: any = null;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    payload = { raw: bodyText?.slice(0, 4000) };
  }

  // Best-effort insert (never fail the request).
  try {
    await prisma.auditEvent.create({
      data: {
        tenantId: null,
        actorUserId: null,
        action: "security.csp.report",
        targetType: null,
        targetId: null,
        metaJson: {
          category: "SECURITY",
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent") ?? null,
          report: payload,
        },
      },
    });
  } catch {
    // ignore
  }

  // CSP report endpoints typically respond 204.
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
