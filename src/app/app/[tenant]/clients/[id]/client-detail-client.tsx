"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { AppCard } from "@/components/app-ui/AppCard";
import {
  COMPLIANCE_CHECK_AREAS,
  getChecklistStatusLabel,
  getChecklistStatusSummary,
  resolveComplianceCheckDefinition,
} from "@/lib/client-compliance";
import { AttentionBadge, ChecklistStatusBadge, formatDateTime, formatRelativeDate } from "../client-ui";

const STATUS_OPTIONS = ["PENDING", "OK", "NOT_APPLICABLE"] as const;

type ClientCheck = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  evidence: Array<{ id: string; createdAt: string; fileName: string | null }>;
};

export default function ClientDetailClient({
  tenant,
  clientId,
  checks,
}: {
  tenant: string;
  clientId: string;
  checks: ClientCheck[];
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(checks.map((check) => [check.id, check.status])) as Record<string, string>
  );
  const [savingCheckId, setSavingCheckId] = useState<string | null>(null);
  const [uploadingCheckId, setUploadingCheckId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    setStatuses(Object.fromEntries(checks.map((check) => [check.id, check.status])) as Record<string, string>);
  }, [checks]);

  const groupedChecks = useMemo(() => {
    const areaGroups = COMPLIANCE_CHECK_AREAS.map((area) => ({
      ...area,
      checks: [] as Array<
        ClientCheck & {
          definition: ReturnType<typeof resolveComplianceCheckDefinition>;
        }
      >,
    }));
    const groupMap = new Map(areaGroups.map((group) => [group.key, group]));

    for (const check of checks) {
      const definition = resolveComplianceCheckDefinition(check.title);
      const areaGroup = groupMap.get(definition.areaKey);
      if (!areaGroup) continue;

      areaGroup.checks.push({
        ...check,
        definition,
      });
    }

    return areaGroups.filter((group) => group.checks.length > 0);
  }, [checks]);

  return (
    <section className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Checklist</div>
        <h2 className="mt-1 text-xl font-semibold text-foreground">Checks and evidence</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Review each control, record the decision clearly, and attach supporting proof so the client record is easy
          to explain during follow-up or pack delivery.
        </p>
      </div>

      {groupedChecks.map((group) => (
        <div key={group.key} className="space-y-3">
          <AppCard className="border-border/70 bg-bg2/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</div>
            <div className="mt-2 text-sm text-muted-foreground">{group.summary}</div>
          </AppCard>

          {group.checks.map((check) => {
            const currentStatus = statuses[check.id] ?? check.status;
            const hasEvidence = check.evidence.length > 0;
            const wasReviewed = check.status !== "PENDING";

            return (
              <AppCard key={check.id} className="overflow-hidden border-border/70">
                <div className="border-b border-border/70 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Control
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">{check.definition.title}</div>
                      <div className="mt-2 max-w-2xl text-sm text-muted-foreground">{check.definition.summary}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ChecklistStatusBadge status={currentStatus} />
                        <AttentionBadge
                          label={
                            hasEvidence
                              ? `${check.evidence.length} evidence file${check.evidence.length === 1 ? "" : "s"}`
                              : "Evidence needed"
                          }
                          level={hasEvidence ? "CLEAR" : currentStatus === "PENDING" ? "FOLLOW_UP" : "DUE"}
                        />
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div>Last review</div>
                      <div className="mt-1 font-medium text-foreground">
                        {wasReviewed ? formatRelativeDate(check.updatedAt) : "Not reviewed yet"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {wasReviewed ? formatDateTime(check.updatedAt) : formatDateTime(check.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-xl border border-border/70 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-foreground/20"
                          value={currentStatus}
                          onChange={(event) =>
                            setStatuses((current) => ({
                              ...current,
                              [check.id]: event.target.value,
                            }))
                          }
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {getChecklistStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-xl border border-border/70 bg-bg1 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-bg2 disabled:opacity-60"
                          disabled={savingCheckId === check.id}
                          onClick={async () => {
                            setSavingCheckId(check.id);
                            setMessages((current) => ({ ...current, [check.id]: "" }));

                            try {
                              const res = await fetch(`/api/app/clients/${clientId}/checks/${check.id}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                  tenant,
                                  status: currentStatus,
                                }),
                              });
                              const data = await res.json();
                              if (!data.ok) {
                                setMessages((current) => ({
                                  ...current,
                                  [check.id]: formatCheckActionMessage(data.error),
                                }));
                                return;
                              }

                              setMessages((current) => ({
                                ...current,
                                [check.id]: "Checklist status saved.",
                              }));
                              router.refresh();
                            } catch {
                              setMessages((current) => ({
                                ...current,
                                [check.id]: formatCheckActionMessage("request_failed"),
                              }));
                            } finally {
                              setSavingCheckId(null);
                            }
                          }}
                          type="button"
                        >
                          {savingCheckId === check.id ? "Saving..." : "Save status"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-bg2/25 p-4 text-sm text-muted-foreground">
                      <div>{getChecklistStatusSummary(currentStatus)}</div>
                      <div className="mt-3 text-xs">
                        Suggested proof: <span className="font-medium text-foreground">{check.definition.evidenceHint}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-bg1/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      Evidence
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Upload a screenshot, export, or internal note for this control. Demo uploads are limited to 2 MB.
                    </div>

                    <div className="mt-4 space-y-2">
                      {check.evidence.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                          No evidence uploaded yet. Add a file that supports the review decision for this control.
                        </div>
                      ) : (
                        check.evidence.map((item) => (
                          <a
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white/70 px-3 py-3 text-sm transition hover:border-foreground/10 hover:shadow-sm"
                            href={`/api/app/clients/${clientId}/evidence/${item.id}?tenant=${encodeURIComponent(tenant)}`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {item.fileName || `Evidence ${formatDateTime(item.createdAt)}`}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</div>
                            </div>
                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </a>
                        ))
                      )}
                    </div>

                    <form
                      className="mt-4 flex flex-wrap items-center gap-2"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        formData.set("tenant", tenant);
                        formData.set("checkId", check.id);

                        setUploadingCheckId(check.id);
                        setMessages((current) => ({ ...current, [check.id]: "" }));

                        try {
                          const res = await fetch(`/api/app/clients/${clientId}/evidence`, {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();
                          if (!data.ok) {
                            setMessages((current) => ({
                              ...current,
                              [check.id]: formatEvidenceActionMessage(data.error),
                            }));
                            return;
                          }

                          event.currentTarget.reset();
                          setMessages((current) => ({
                            ...current,
                            [check.id]: "Evidence attached to this control.",
                          }));
                          router.refresh();
                        } catch {
                          setMessages((current) => ({
                            ...current,
                            [check.id]: formatEvidenceActionMessage("request_failed"),
                          }));
                        } finally {
                          setUploadingCheckId(null);
                        }
                      }}
                    >
                      <input className="text-sm" name="file" type="file" required />
                      <button
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                        disabled={uploadingCheckId === check.id}
                        type="submit"
                      >
                        {uploadingCheckId === check.id ? "Uploading..." : "Upload evidence"}
                      </button>
                    </form>
                  </div>
                </div>

                {messages[check.id] ? (
                  <div className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">{messages[check.id]}</div>
                ) : null}
              </AppCard>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function formatCheckActionMessage(error: string | undefined) {
  if (error === "request_failed") return "We could not save the checklist status. Please try again.";
  if (error === "not_found") return "This checklist item is no longer available.";
  return "We could not save the checklist status. Please try again.";
}

function formatEvidenceActionMessage(error: string | undefined) {
  if (error === "file_too_large") return "Evidence files must be 2 MB or smaller in this demo flow.";
  if (error === "missing_file") return "Choose a file before uploading evidence.";
  if (error === "empty_file") return "The selected file is empty. Choose another file.";
  if (error === "request_failed") return "We could not upload the evidence file. Please try again.";
  if (error === "not_found") return "This client record or checklist item is no longer available.";
  return "We could not upload the evidence file. Please try again.";
}
