import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { getPublicTenant } from "@/lib/public-tenant";

function cssVarColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const v = value.trim();
  return v ? v : fallback;
}

export default async function TenantPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);

  const theme = data?.theme;
  const primary = cssVarColor(theme?.primary, "#111111");
  const accent = cssVarColor(theme?.accent, "#F59E0B");

  const brandName = theme?.brandName ?? data?.tenant.name ?? tenant;
  const logoUrl = theme?.logoUrl ?? null;

  return (
    <div
      className="min-h-screen"
      style={
        {
          ["--brand-primary" as any]: primary,
          ["--brand-accent" as any]: accent,
        } as React.CSSProperties
      }
    >
      <header
        className="border-b"
        style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 18%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link href={`/t/${tenant}`} className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded object-cover" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                {brandName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <span className="font-semibold">{brandName}</span>
          </Link>

          {/* Desktop */}
          <nav className="hidden gap-4 text-sm md:flex">
            <Link className="hover:underline" href={`/t/${tenant}/servicios`}>Servicios</Link>
            <Link className="hover:underline" href={`/t/${tenant}/sobre`}>Sobre</Link>
            <Link className="hover:underline" href={`/t/${tenant}/contacto`}>Contacto</Link>
          </nav>

          {/* Mobile */}
          <PublicNav tenant={tenant} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">{children}</div>
    </div>
  );
}
