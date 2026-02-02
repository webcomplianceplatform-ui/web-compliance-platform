import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm transition-all active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-foreground text-background hover:opacity-90 hover:shadow-md"
      : variant === "secondary"
      ? "glass glass-hover hover:bg-muted/40"
      : "hover:bg-muted";

  return (
    <Link href={href} className={cn(base, styles, className)}>
      {children}
    </Link>
  );
}
