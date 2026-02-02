import * as React from "react";
import { cn } from "@/lib/utils";

export function AppTable({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // ✅ Mobile: scroll horizontal
        // ✅ Desktop: no scroll, tabla ocupa el ancho disponible
        "w-full overflow-x-auto md:overflow-x-visible rounded-2xl border border-border bg-bg1/80 backdrop-blur supports-[backdrop-filter]:bg-bg1/60",
        className
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
      {...props}
    >
      {/* ✅ Mobile: allow wider than viewport to scroll
          ✅ Desktop: fit container (no forced min width) */}
      <table className="w-full text-sm md:table-fixed">
        {children}
      </table>
    </div>
  );
}

export function AppTableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-border bg-bg2/40 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function AppTableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border/70 last:border-b-0 hover:bg-bg2/30",
        className
      )}
      {...props}
    />
  );
}
