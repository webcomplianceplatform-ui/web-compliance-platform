import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "outline" | "success" | "warning" | "danger" | "muted";
}) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

  const variants: Record<NonNullable<typeof variant>, string> = {
    default: "bg-black text-white",
    outline: "border bg-white text-black",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-red-600 text-white",
    muted: "bg-muted text-foreground",
  };

  return <span className={cn(base, variants[variant], className)} {...props} />;
}
