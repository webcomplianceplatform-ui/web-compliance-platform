import * as React from "react";

import { cn } from "@/lib/utils";

export function AppInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
        "backdrop-blur supports-[backdrop-filter]:bg-bg2/40",
        "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2",
        className
      )}
      {...props}
    />
  );
}

export function AppTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
        "backdrop-blur supports-[backdrop-filter]:bg-bg2/40",
        "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2",
        className
      )}
      {...props}
    />
  );
}
