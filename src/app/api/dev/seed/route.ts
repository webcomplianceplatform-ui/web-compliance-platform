import { NextResponse } from "next/server";
import { requireDevAccess } from "@/lib/dev-guard";

export async function POST(req: Request) {
  const gate = requireDevAccess(req);
  if (gate.ok === false) return gate.res;

  return NextResponse.json({ ok: true });
}
