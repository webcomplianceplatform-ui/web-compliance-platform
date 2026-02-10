import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const u = new URL(req.url);
  const qs = u.search ? u.search : "";
  return NextResponse.redirect(new URL(`/api/app/${tenant}/evidence/legal/consents/export${qs}`, u.origin), 302);
}
