import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
console.log("DB_HOST", (() => {
  try { return new URL(process.env.DATABASE_URL ?? "").host; } catch { return "bad-url"; }
})());
console.log("DB_USER", (() => {
  try { return new URL(process.env.DATABASE_URL ?? "").username; } catch { return "bad-url"; }
})());

export async function POST() {
  return Response.json({ ok: true });
}

