import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// MVP: rate limit muy básico (en memoria). En serverless no es perfecto, pero vale.
const hits = new Map<string, { count: number; ts: number }>();
function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.ts > windowMs) {
    hits.set(key, { count: 1, ts: now });
    return true;
  }
  if (cur.count >= limit) return false;
  cur.count += 1;
  hits.set(key, cur);
  return true;
}

function clean(s: unknown, max = 2000) {
  if (typeof s !== "string") return "";
  const v = s.trim();
  if (!v) return "";
  return v.length > max ? v.slice(0, max) : v;
}

export async function POST(req: Request) {
  // IP (best-effort)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`contact:${ip}`)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const tenant = clean(body?.tenant, 80);
  const name = clean(body?.name, 120);
  const email = clean(body?.email, 180);
  const message = clean(body?.message, 4000);

  // honeypot anti-bot (campo oculto)
  const website = clean(body?.website, 200);
  if (website) {
    // bot detected
    return NextResponse.json({ ok: true }); // no damos info
  }

  if (!tenant || !message) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  // Busca tenant y su OWNER para usarlo como createdBy
  const owner = await prisma.userTenant.findFirst({
    where: {
      role: "OWNER",
      tenant: { slug: tenant },
    },
    select: { tenantId: true, userId: true },
  });

  if (!owner) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const title = `Contacto web${name ? ` - ${name}` : ""}${email ? ` <${email}>` : ""}`;
  const description =
    `Mensaje desde /contacto\n` +
    (name ? `Nombre: ${name}\n` : "") +
    (email ? `Email: ${email}\n` : "") +
    `\n---\n${message}`;

  // MUY IMPORTANTE: para evitar líos de enums (lo has sufrido),
  // NO seteamos type/priority/status => dejamos que el DB default decida.
  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      tenant: { connect: { id: owner.tenantId } },
      createdBy: { connect: { id: owner.userId } },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: ticket.id });
}
