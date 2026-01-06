import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

export function jsonOk(data: any = {}, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function jsonError(error: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ ok: false, error, ...(extra ?? {}) }, { status });
}

export async function parseJson<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, res: jsonError("invalid_json", 400) };
  }

  try {
    const data = schema.parse(raw);
    return { ok: true, data };
  } catch (e) {
    const z = e as ZodError;
    return {
      ok: false,
      res: jsonError("invalid_body", 400, {
        issues: z.issues?.map((i) => ({ path: i.path.join("."), message: i.message })),
      }),
    };
  }
}
