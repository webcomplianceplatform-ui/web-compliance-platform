import { prisma } from "@/lib/db";

export type PlanTier = "CONTROL" | "COMPLIANCE" | "ASSURED";

/**
 * ✅ Canonical plan payload (stored in TenantPlan.features).
 * Keep this shape stable — it becomes your "contract" for packs.
 */
export type PlanFeaturesPayload = {
  modules: {
    tickets: boolean;
    /** Public intake (contact → LEAD). Separate from internal ticketing. */
    intake: boolean;
    monitoring: boolean;
    legal: boolean;
    security: boolean;
    web: boolean;
  };
  limits?: {
    seats?: number;
    domains?: number;
  };
  security?: {
    mfa?: boolean;
    audit?: "basic" | "advanced";
    alerts?: boolean;
  };
  support?: {
    sla?: "standard" | "priority" | "assured";
  };
};

export const PLAN_FEATURES: Record<PlanTier, PlanFeaturesPayload> = {
  CONTROL: {
    modules: { tickets: true, intake: true, monitoring: true, legal: false, security: false, web: false },
    limits: { seats: 3, domains: 1 },
    security: { mfa: false, audit: "basic", alerts: false },
    support: { sla: "standard" },
  },
  COMPLIANCE: {
    modules: { tickets: true, intake: true, monitoring: true, legal: true, security: false, web: false },
    limits: { seats: 5, domains: 2 },
    security: { mfa: false, audit: "basic", alerts: false },
    support: { sla: "priority" },
  },
  ASSURED: {
    modules: { tickets: true, intake: true, monitoring: true, legal: true, security: true, web: false },
    limits: { seats: 10, domains: 3 },
    security: { mfa: true, audit: "advanced", alerts: true },
    support: { sla: "assured" },
  },
};

/** Add-on: WEB_SIMPLE (merged on top of base plan) */
export const ADDON_WEB_SIMPLE: Partial<PlanFeaturesPayload> = {
  modules: { web: true } as any,
  limits: { domains: 1 },
};

/** Add-on: SECURITY (merged on top of base plan) */
export const ADDON_SECURITY: Partial<PlanFeaturesPayload> = {
  modules: { security: true } as any,
  security: { mfa: true, audit: "advanced", alerts: true },
};

/**
 * What the app needs for gating (nav + route protection).
 * Keep these booleans stable so the rest of the app stays simple.
 */
export type TenantFeatures = {
  tickets: boolean;
  intake: boolean;
  legal: boolean;
  monitoring: boolean;
  security: boolean;
  web: boolean;
  plan?: PlanTier;
  raw?: PlanFeaturesPayload;
  /** Tenant policy: whether MFA is enforced for panel access. */
  mfaRequired?: boolean;
};

function mergeDeep<T extends Record<string, any>>(base: T, patch?: Partial<T> | null): T {
  if (!patch) return base;
  const out: any = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = mergeDeep(out[k] ?? {}, v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function buildPlanPayload(args: {
  plan: PlanTier;
  addons?: { webSimple?: boolean; security?: boolean };
  overrides?: Partial<PlanFeaturesPayload>;
}): PlanFeaturesPayload {
  const base = PLAN_FEATURES[args.plan];
  let payload = mergeDeep<PlanFeaturesPayload>({ ...base }, null);

  if (args.addons?.webSimple) payload = mergeDeep(payload, ADDON_WEB_SIMPLE as any);
  if (args.addons?.security) payload = mergeDeep(payload, ADDON_SECURITY as any);

  if (args.overrides) payload = mergeDeep(payload, args.overrides);

  // Normalize: ensure all module keys exist
  payload.modules = {
    tickets: !!payload.modules?.tickets,
    // Back-compat: older payloads may store this as "leads"
    intake: !!(payload.modules as any)?.intake || !!(payload.modules as any)?.leads,
    monitoring: !!payload.modules?.monitoring,
    legal: !!payload.modules?.legal,
    security: !!payload.modules?.security,
    web: !!payload.modules?.web,
  };

  return payload;
}

function toTenantFeatures(plan: PlanTier | null, payload: any, mfaRequired?: boolean): TenantFeatures {
  // Backwards compatible: old payloads were { tickets, legal, monitoring, security, web }
  const looksOld = payload && typeof payload === "object" && !payload.modules;
  const p: PlanFeaturesPayload = looksOld
    ? {
        modules: {
          tickets: !!payload.tickets,
          // Back-compat: in old shape, "leads" was implicit when tickets existed.
          intake: !!payload.tickets,
          monitoring: !!payload.monitoring,
          legal: !!payload.legal,
          security: !!payload.security,
          web: !!payload.web,
        },
      }
    : (payload as PlanFeaturesPayload);

  return {
    tickets: !!p.modules?.tickets,
    // Back-compat: some stored payloads may still have modules.leads
    intake: !!(p.modules as any)?.intake || !!(p.modules as any)?.leads,
    monitoring: !!p.modules?.monitoring,
    legal: !!p.modules?.legal,
    security: !!p.modules?.security,
    web: !!p.modules?.web,
    plan: plan ?? undefined,
    raw: p,
    mfaRequired: !!mfaRequired,
  };
}

export async function getTenantFeatures(tenantId: string): Promise<TenantFeatures> {
  const plan = await prisma.tenantPlan.findUnique({
    where: { tenantId },
    select: { plan: true, features: true, mfaRequired: true },
  });

  // If no plan row yet, default to COMPLIANCE (sensible default for your positioning).
  if (!plan) {
    const payload = buildPlanPayload({ plan: "COMPLIANCE" });
    return toTenantFeatures("COMPLIANCE", payload, false);
  }

  return toTenantFeatures((plan.plan as any) ?? null, plan.features as any, !!plan.mfaRequired);
}
