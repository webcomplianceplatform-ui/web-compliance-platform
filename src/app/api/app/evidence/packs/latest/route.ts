export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { prisma } from "@/lib/db";
import { createSignedDownloadUrl } from "@/lib/evidence-storage";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const clientUserId = url.searchParams.get("clientUserId");

  const pack = await prisma.evidencePack.findFirst({
    where: {
      tenantId: auth.ctx.tenantId,
      ...(clientUserId ? { clientUserId: String(clientUserId) } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!pack) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const signedUrl = await createSignedDownloadUrl({
    bucket: (pack as any).storageBucket || undefined,
    path: (pack as any).storagePath,
    expiresInSec: 300,
    downloadFilename: `evidence_pack_${tenant}_${(pack as any).id}.pdf`,
  });

  return NextResponse.redirect(signedUrl, 302);
}
