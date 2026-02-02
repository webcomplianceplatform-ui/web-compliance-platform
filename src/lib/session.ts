import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export type SessionUserLike = {
  email?: string | null;
  id?: string | null;
  sessionVersion?: number | null;
  sessionId?: string | null;
};

export async function enforceSessionActivePage(opts: {
  sessionUser: SessionUserLike;
  dbUser: { id: string; sessionVersion: number };
  redirectTo?: string;
  checkStepUp?: boolean;
  stepUpCallbackUrl?: string;
}) {
  const sv = Number(opts.sessionUser.sessionVersion ?? 0);
  if (sv !== Number(opts.dbUser.sessionVersion ?? 0)) {
    redirect(opts.redirectTo ?? "/login");
  }

  const sid = (opts.sessionUser.sessionId ?? null) as string | null;
  if (!sid) {
    redirect(opts.redirectTo ?? "/login");
  }

  const rec = await prisma.userSession.findUnique({
    where: { id: sid },
    select: { userId: true, revokedAt: true, requiresStepUp: true },
  });

  if (!rec || rec.userId !== opts.dbUser.id || !!rec.revokedAt) {
    redirect(opts.redirectTo ?? "/login");
  }

  if (opts.checkStepUp && rec.requiresStepUp) {
    const cb = opts.stepUpCallbackUrl ?? "/app";
    redirect(`/app/account/mfa/verify?callbackUrl=${encodeURIComponent(cb)}`);
  }
}

export async function enforceSessionActiveApi(opts: {
  sessionUser: SessionUserLike;
  dbUser: { id: string; sessionVersion: number };
  checkStepUp?: boolean;
}) {
  const sv = Number(opts.sessionUser.sessionVersion ?? 0);
  if (sv !== Number(opts.dbUser.sessionVersion ?? 0)) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const sid = (opts.sessionUser.sessionId ?? null) as string | null;
  if (!sid) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const rec = await prisma.userSession.findUnique({
    where: { id: sid },
    select: { userId: true, revokedAt: true, requiresStepUp: true },
  });

  if (!rec || rec.userId !== opts.dbUser.id || !!rec.revokedAt) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  if (opts.checkStepUp && rec.requiresStepUp) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "step_up_required" }, { status: 428 }),
    };
  }

  return { ok: true as const };
}
