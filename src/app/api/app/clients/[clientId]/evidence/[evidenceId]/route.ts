import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { isAgencyPlan } from "@/lib/client-compliance";

export async function GET(req: Request, routeCtx: any) {
  const params = await routeCtx.params;
  const clientId = String(params?.clientId ?? "");
  const evidenceId = String(params?.evidenceId ?? "");
  const tenant = new URL(req.url).searchParams.get("tenant")?.trim();

  if (!tenant) {
    return jsonError("missing_tenant", 400);
  }

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  if (!isAgencyPlan(auth.ctx.features.plan)) {
    return jsonError("agency_only", 403);
  }

  const evidence = await prisma.evidence.findFirst({
    where: {
      id: evidenceId,
      clientId,
      client: { tenantId: auth.ctx.tenantId },
    },
    select: {
      id: true,
      fileUrl: true,
      fileName: true,
    },
  });

  if (!evidence) {
    return jsonError("not_found", 404);
  }

  if (!evidence.fileUrl.startsWith("data:")) {
    return NextResponse.redirect(evidence.fileUrl);
  }

  const match = evidence.fileUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    return jsonError("invalid_file", 500);
  }

  const [, contentType, base64] = match;
  const bytes = Buffer.from(base64, "base64");

  return new NextResponse(bytes, {
    headers: {
      "content-type": contentType || "application/octet-stream",
      "content-disposition": `attachment; filename="${sanitizeFileName(
        evidence.fileName || `evidence-${evidence.id}`
      )}"`,
    },
  });
}

function sanitizeFileName(value: string) {
  return value.replace(/[^\w.-]+/g, "_");
}
