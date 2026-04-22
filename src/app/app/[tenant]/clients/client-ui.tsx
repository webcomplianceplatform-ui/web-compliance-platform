import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getChecklistStatusLabel,
  type ClientAttentionLevel,
  type ComplianceStatusColor,
} from "@/lib/client-compliance";

export function ComplianceStatusBadge({
  status,
  className,
}: {
  status: ComplianceStatusColor;
  className?: string;
}) {
  const tone =
    status === "GREEN"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "RED"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Badge
      variant="outline"
      className={cn("border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", tone, className)}
    >
      {status}
    </Badge>
  );
}

export function AttentionBadge({
  level,
  label,
  className,
}: {
  level: ClientAttentionLevel;
  label: string;
  className?: string;
}) {
  const tone =
    level === "CLEAR"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : level === "AT_RISK"
        ? "border-red-200 bg-red-50 text-red-700"
        : level === "DUE"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <Badge variant="outline" className={cn("border px-2.5 py-1 text-[11px] font-medium", tone, className)}>
      {label}
    </Badge>
  );
}

export function ChecklistStatusBadge({
  status,
  className,
}: {
  status: "PENDING" | "OK" | "NOT_APPLICABLE" | string;
  className?: string;
}) {
  const tone =
    status === "OK"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "NOT_APPLICABLE"
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Badge variant="outline" className={cn("border px-2.5 py-1 text-[11px] font-medium", tone, className)}>
      {getChecklistStatusLabel(status)}
    </Badge>
  );
}

export function formatRelativeDate(value: Date | string | null | undefined) {
  if (!value) return "No activity";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "No activity";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return date.toLocaleString();
}
