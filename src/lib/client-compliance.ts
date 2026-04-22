import { ComplianceCheckStatus } from "@prisma/client";

export type ComplianceStatusColor = "GREEN" | "YELLOW" | "RED";
export type ClientAttentionLevel = "CLEAR" | "FOLLOW_UP" | "DUE" | "AT_RISK";
export type ComplianceChecklistAreaKey =
  | "CONSENT_AND_COOKIES"
  | "TRANSPARENCY_AND_NOTICE"
  | "FORMS_AND_DATA_CAPTURE";

export type ComplianceChecklistDefinition = {
  key: string;
  areaKey: ComplianceChecklistAreaKey;
  title: string;
  summary: string;
  evidenceHint: string;
  aliases?: readonly string[];
};

export const COMPLIANCE_CHECK_AREAS = [
  {
    key: "CONSENT_AND_COOKIES" as const,
    label: "Consent and cookies",
    summary:
      "Review whether non-essential cookies are disclosed clearly and held back until the visitor makes a choice.",
  },
  {
    key: "TRANSPARENCY_AND_NOTICE" as const,
    label: "Transparency and notice",
    summary:
      "Confirm the public site publishes privacy information that a visitor can find before sharing personal data.",
  },
  {
    key: "FORMS_AND_DATA_CAPTURE" as const,
    label: "Forms and data capture",
    summary:
      "Check that lead forms explain why data is collected and capture valid consent when the client relies on it.",
  },
] as const;

export const DEFAULT_COMPLIANCE_CHECK_DEFINITIONS: readonly ComplianceChecklistDefinition[] = [
  {
    key: "cookie_banner",
    areaKey: "CONSENT_AND_COOKIES",
    title: "Cookie banner blocks non-essential cookies before consent",
    summary:
      "Visitors should see a clear cookie notice before analytics, advertising, or other non-essential trackers load.",
    evidenceHint:
      "Homepage screenshot, consent manager settings, or a browser capture showing trackers blocked before acceptance.",
    aliases: ["Cookie banner"],
  },
  {
    key: "consent_tracking",
    areaKey: "CONSENT_AND_COOKIES",
    title: "Consent choices are recorded for analytics and marketing",
    summary:
      "The client should keep a record of acceptance or rejection for optional cookies and tracking where that tooling is used.",
    evidenceHint:
      "Consent log export, CMP dashboard capture, or analytics settings showing consent mode or equivalent controls.",
    aliases: ["Consent tracking"],
  },
  {
    key: "privacy_policy",
    areaKey: "TRANSPARENCY_AND_NOTICE",
    title: "Privacy policy is published and reachable from the site",
    summary:
      "The privacy notice should be available from the public site and explain who collects data, why, and how people can exercise their rights.",
    evidenceHint: "Live site link, footer screenshot, or PDF copy of the published privacy notice.",
    aliases: ["Privacy policy"],
  },
  {
    key: "forms_compliance",
    areaKey: "FORMS_AND_DATA_CAPTURE",
    title: "Forms include privacy notice and valid consent language",
    summary:
      "Lead and contact forms should explain the purpose of collection and present any required consent or acceptance wording clearly.",
    evidenceHint:
      "Form screenshot, CRM form configuration, or embedded-form settings showing notice text and consent fields.",
    aliases: ["Forms compliance"],
  },
] as const;

export const DEFAULT_COMPLIANCE_CHECKS = DEFAULT_COMPLIANCE_CHECK_DEFINITIONS.map(
  (check) => check.title
);

const checklistDefinitionByTitle = new Map<string, ComplianceChecklistDefinition>();
for (const definition of DEFAULT_COMPLIANCE_CHECK_DEFINITIONS) {
  checklistDefinitionByTitle.set(normalizeCheckLookup(definition.title), definition);
  for (const alias of definition.aliases ?? []) {
    checklistDefinitionByTitle.set(normalizeCheckLookup(alias), definition);
  }
}

export function isAgencyPlan(plan?: string | null) {
  return String(plan ?? "").toUpperCase() === "ASSURED";
}

export function computeComplianceStatus(
  checks: Array<{ status: ComplianceCheckStatus | string }>
): ComplianceStatusColor {
  const total = checks.length;
  const pending = checks.filter((check) => check.status === ComplianceCheckStatus.PENDING).length;

  if (total === 0) return "YELLOW";
  if (pending === 0) return "GREEN";
  if (total > 0 && pending >= Math.ceil(total / 2)) return "RED";
  return "YELLOW";
}

export function pendingChecksCount(checks: Array<{ status: ComplianceCheckStatus | string }>) {
  return checks.filter((check) => check.status === ComplianceCheckStatus.PENDING).length;
}

export function resolvedChecksCount(checks: Array<{ status: ComplianceCheckStatus | string }>) {
  return checks.filter((check) => check.status !== ComplianceCheckStatus.PENDING).length;
}

export function computeLastActivityAt(args: {
  clientCreatedAt: Date | string;
  checks?: Array<{ updatedAt?: Date | string | null; createdAt?: Date | string | null }>;
  evidence?: Array<{ createdAt?: Date | string | null }>;
}) {
  const values = [
    toDate(args.clientCreatedAt),
    ...(args.checks ?? []).flatMap((check) => [toDate(check.updatedAt), toDate(check.createdAt)]),
    ...(args.evidence ?? []).map((item) => toDate(item.createdAt)),
  ].filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));

  if (values.length === 0) return null;

  return values.reduce((latest, current) => (current.getTime() > latest.getTime() ? current : latest));
}

export function computeAttentionState(args: {
  checks: Array<{ status: ComplianceCheckStatus | string }>;
  lastActivityAt?: Date | string | null;
  now?: Date;
}) {
  const pending = pendingChecksCount(args.checks);
  const total = args.checks.length;
  const lastActivity = toDate(args.lastActivityAt);
  const now = args.now ?? new Date();
  const ageDays =
    lastActivity && !Number.isNaN(lastActivity.getTime())
      ? Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

  if (pending === 0) {
    return { level: "CLEAR" as ClientAttentionLevel, label: "On track" };
  }

  if (total > 0 && pending >= Math.ceil(total / 2)) {
    return {
      level: "AT_RISK" as ClientAttentionLevel,
      label: ageDays >= 7 ? "High attention" : "Needs attention",
    };
  }

  if (ageDays >= 14) {
    return { level: "DUE" as ClientAttentionLevel, label: "Follow-up due" };
  }

  return { level: "FOLLOW_UP" as ClientAttentionLevel, label: "In progress" };
}

export function getComplianceAreaDefinition(areaKey: ComplianceChecklistAreaKey) {
  return COMPLIANCE_CHECK_AREAS.find((area) => area.key === areaKey) ?? COMPLIANCE_CHECK_AREAS[0];
}

export function resolveComplianceCheckDefinition(title: string) {
  return (
    checklistDefinitionByTitle.get(normalizeCheckLookup(title)) ?? {
      key: normalizeCheckLookup(title),
      areaKey: "TRANSPARENCY_AND_NOTICE" as const,
      title,
      summary: "Review this client control and record the evidence that supports the decision.",
      evidenceHint: "Screenshot, export, or internal review note that supports the checklist decision.",
    }
  );
}

export function getComplianceStatusSummary(status: ComplianceStatusColor) {
  if (status === "GREEN") {
    return {
      label: "Ready for pack",
      description: "All starter controls already have a review decision.",
    };
  }

  if (status === "RED") {
    return {
      label: "Priority follow-up",
      description: "Most checklist items are still pending and need a decision.",
    };
  }

  return {
    label: "Review in progress",
    description: "Some controls are complete and some still need follow-up.",
  };
}

export function getChecklistStatusLabel(status: ComplianceCheckStatus | string) {
  if (status === ComplianceCheckStatus.OK) return "Control met";
  if (status === ComplianceCheckStatus.NOT_APPLICABLE) return "Not applicable";
  return "Needs review";
}

export function getChecklistStatusSummary(status: ComplianceCheckStatus | string) {
  if (status === ComplianceCheckStatus.OK) {
    return "This control has been reviewed and is considered covered for the current client setup.";
  }

  if (status === ComplianceCheckStatus.NOT_APPLICABLE) {
    return "Use this when the control does not apply to the client's setup or data flows.";
  }

  return "This control still needs a review decision, supporting evidence, or an exception note.";
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function normalizeCheckLookup(value: string) {
  return value.trim().toLowerCase();
}
