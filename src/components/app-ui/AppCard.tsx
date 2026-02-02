import * as React from "react";

import { cn } from "@/lib/utils";

export function AppCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-bg1/80 backdrop-blur supports-[backdrop-filter]:bg-bg1/60",
        "shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppCardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-4 md:p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function AppCardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-4 pb-4 md:px-5 md:pb-5", className)} {...props}>
      {children}
    </div>
  );
}
