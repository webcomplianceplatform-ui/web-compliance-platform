import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { isAgencyPlan } from "@/lib/client-compliance";

const MAX_EVIDENCE_FILE_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request, routeCtx: any) {
  const params = await routeCtx.params;
  const clientId = String(params?.clientId ?? "");

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("invalid_form_data", 400);
  }

  const tenant = String(formData.get("tenant") ?? "").trim();
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

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: auth.ctx.tenantId },
    select: { id: true },
  });
  if (!client) {
    return jsonError("not_found", 404);
  }

  const rawCheckId = formData.get("checkId");
  const checkId =
    typeof rawCheckId === "string" && rawCheckId.trim().length > 0 ? rawCheckId.trim() : null;

  if (checkId) {
    const check = await prisma.complianceCheck.findFirst({
      where: { id: checkId, clientId },
      select: { id: true },
    });
    if (!check) {
      return jsonError("not_found", 404);
    }
  }

  const rawFile = formData.get("file");
  if (!rawFile || typeof rawFile === "string") {
    return jsonError("missing_file", 400);
  }

  if (rawFile.size <= 0) {
    return jsonError("empty_file", 400);
  }

  if (rawFile.size > MAX_EVIDENCE_FILE_BYTES) {
    return jsonError("file_too_large", 400, { maxBytes: MAX_EVIDENCE_FILE_BYTES });
  }

  const contentType = rawFile.type || "application/octet-stream";
  const fileName = rawFile.name?.trim() || "evidence-file";
  const bytes = Buffer.from(await rawFile.arrayBuffer());
  const fileUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

  const evidence = await prisma.evidence.create({
    data: {
      clientId,
      checkId,
      fileUrl,
      fileName,
    },
    select: { id: true },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "client.evidence.upload",
    targetType: "evidence",
    targetId: evidence.id,
    meta: {
      clientId,
      checkId,
      fileName,
      sizeBytes: rawFile.size,
      contentType,
    },
  });

  return jsonOk({ id: evidence.id });
}
