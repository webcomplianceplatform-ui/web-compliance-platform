import Link from "next/link";

export default function PublicFooter({
  tenant,
  brandName,
  aboutText,
  email,
  phone,
  location,
  copyright,
  usesAnalytics,
}: {
  tenant: string;
  brandName: string;
  aboutText?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  copyright?: string | null;
  usesAnalytics: boolean;
}) {
  return (
    <footer
      className="mt-14 border-t"
      style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 18%, transparent)" }}
    >
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--brand-primary)" }}>
              {brandName}
            </div>
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">
              {aboutText?.trim() || ""}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            {email?.trim() ? (
              <div className="flex items-center gap-2">
                <span aria-hidden>✉️</span>
                <a className="hover:underline" href={`mailto:${email}`}> {email} </a>
              </div>
            ) : null}
            {phone?.trim() ? (
              <div className="flex items-center gap-2">
                <span aria-hidden>📞</span>
                <a className="hover:underline" href={`tel:${phone}`}> {phone} </a>
              </div>
            ) : null}
            {location?.trim() ? (
              <div className="flex items-center gap-2">
                <span aria-hidden>📍</span>
                <span className="text-muted-foreground">{location}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 border-t pt-6" style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 18%, transparent)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              {copyright?.trim() || `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <Link className="hover:underline" href={`/t/${tenant}/legal/aviso-legal`}>
                Aviso Legal
              </Link>
              <Link className="hover:underline" href={`/t/${tenant}/legal/privacidad`}>
                Política de Privacidad
              </Link>
              <Link className="hover:underline" href={`/t/${tenant}/legal/cookies`}>
                Política de Cookies
              </Link>
              {usesAnalytics ? (
                <Link className="hover:underline" href={`/t/${tenant}/legal/cookies?manage=1`}>
                  Preferencias
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
