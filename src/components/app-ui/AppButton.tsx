import * as React from "react";
import { cn } from "@/lib/utils";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type AppButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 " +
  "disabled:pointer-events-none disabled:opacity-60";

const variants: Record<AppButtonVariant, string> = {
  primary:
    // Primary is the brand green. Force dark text for readability.
    "bg-brand text-black hover:opacity-95 hover:-translate-y-0.5 hover:shadow-sm",

  secondary:
    "border border-border bg-bg2/60 text-foreground hover:bg-bg2/80",

  ghost:
    "text-foreground hover:bg-bg2/60",

  danger:
    "bg-destructive text-destructive-foreground hover:opacity-95 hover:-translate-y-0.5 hover:shadow-sm",
};

const sizes: Record<AppButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function appButtonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  className?: string;
}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function AppButton({
  className,
  variant = "primary",
  size = "md",
  type,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
}) {
  return (
    <button
      type={type ?? "button"}
      className={appButtonClassName({ variant, size, className })}
      {...props}
    />
  );
}
