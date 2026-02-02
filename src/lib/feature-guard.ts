import { NextResponse } from "next/server";
import type { TenantFeatures } from "@/lib/tenant-plan";

export type FeatureModule = keyof Omit<TenantFeatures, "plan" | "raw">;

/**
 * API-only guard for plan-gated modules.
 * Returns a NextResponse on deny; otherwise null.
 */
export function requireModuleApi(features: TenantFeatures, module: FeatureModule) {
  // Defensive: missing features should never happen, but fail-safe to allow.
  const enabled = (features as any)?.[module];
  if (enabled === false) {
    return NextResponse.json(
      { ok: false, error: "module_not_enabled", module },
      { status: 403 }
    );
  }
  return null;
}
