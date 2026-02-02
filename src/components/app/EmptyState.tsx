import Link from "next/link";
import { AppCard } from "@/components/app-ui/AppCard";
import { appButtonClassName } from "@/components/app-ui/AppButton";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <AppCard className="p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <div className="mt-4">
          <Link className={appButtonClassName({ variant: "secondary" })} href={actionHref}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </AppCard>
  );
}
