import Link from "next/link";
import type { SiteSection } from "@/lib/theme";
import { FadeIn, Stagger, StaggerItem } from "@/components/public/Motion";
import { Layout, Scale, Shield, Ticket, Wrench, Zap, Sparkles, Search, Globe } from "lucide-react";

function Icon({ name }: { name?: string | null }) {
  const n = (name ?? "").trim();
  if (!n) return null;

  // Small mapping for the most common "corporate SaaS" icons.
  const map: Record<string, any> = {
    Zap,
    Shield,
    Wrench,
    Ticket,
    Layout,
    Scale,
    Sparkles,
    Search,
    Globe,
  };

  const C = map[n];
  if (C) return <C className="h-4 w-4" aria-hidden />;

  // Fallback: allow emojis or short strings (e.g. "✅").
  if (n.length <= 4) return <span aria-hidden>{n}</span>;
  return null;
}

function smartHref(tenant: string, href?: string | null) {
  const h = (href ?? "").trim();
  if (!h) return `/t/${tenant}/contacto`;
  // allow relative paths like "/contacto" or "#features"
  if (h.startsWith("/")) return `/t/${tenant}${h}`;
  if (h.startsWith("#")) return `/t/${tenant}${h}`;
  return `/t/${tenant}/${h}`;
}

export function SectionRenderer({
  tenant,
  sections,
}: {
  tenant: string;
  sections: SiteSection[];
}) {
  if (!sections?.length) return null;

  return (
    <div className="space-y-12">
      {sections.map((s) => {
        switch (s.type) {
          case "hero":
            return (
              <section
                key={s.id}
                className="relative overflow-hidden rounded-3xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10"
              >
                {s.backgroundUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.backgroundUrl}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/35" />
                  </>
                ) : (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{
                      background:
                        "radial-gradient(1200px 400px at 20% 10%, hsl(var(--brand) / 0.22), transparent 55%), radial-gradient(900px 500px at 80% 0%, hsl(var(--brand-2) / 0.16), transparent 60%)",
                    }}
                  />
                )}

                <div className={s.layout === "split" ? "grid gap-6 md:grid-cols-2 md:items-center" : ""}>
                  <div>

                <FadeIn>
                  <h1 className="relative max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">
                    {s.headline ?? "Tu web corporativa, rápida y compliant"}
                  </h1>
                </FadeIn>
                {s.subheadline ? (
                  <FadeIn delay={0.08}>
                    <p className="relative mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                      {s.subheadline}
                    </p>
                  </FadeIn>
                ) : null}
                <FadeIn delay={0.14}>
                  <div className="relative mt-6 flex flex-wrap gap-3">
                    <Link
                      href={smartHref(tenant, s.ctaHref)}
                      className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {s.ctaText ?? "Contactar"}
                    </Link>
                    <Link
                      href={`/t/${tenant}/servicios`}
                      className="rounded-xl border px-4 py-2 text-sm transition hover:-translate-y-0.5 hover:bg-white/60"
                    >
                      Ver servicios
                    </Link>
                  </div>
                </FadeIn>
                  </div>

                  {s.layout === "split" && s.imageUrl ? (
                    <FadeIn delay={0.06}>
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.imageUrl}
                          alt=""
                          className="mx-auto w-full max-w-[520px] rounded-3xl border bg-black/10 p-3 shadow-sm"
                        />
                      </div>
                    </FadeIn>
                  ) : null}
                </div>
              </section>
            );

          case "features":
            return (
              <section key={s.id} className="space-y-4">
                <FadeIn>
                  <div>
                    <h2 className="text-2xl font-semibold">{s.title ?? "Features"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Lo que hace que esto se sienta producto.</p>
                  </div>
                </FadeIn>
                <Stagger className="grid gap-3 md:grid-cols-3">
                  {(s.items ?? []).map((it, idx) => (
                    <StaggerItem
                      key={idx}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                      }}
                      className="group rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-white/50">
                          <Icon name={it.icon} />
                        </span>
                        <div className="font-medium">{it.title}</div>
                      </div>
                      {it.description ? (
                        <div className="mt-1 text-sm text-muted-foreground">{it.description}</div>
                      ) : null}
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            );

          case "services":
            return (
              <section key={s.id} className="space-y-4">
                <FadeIn>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold">{s.title ?? "Servicios"}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Lo esencial, explicado en claro.</p>
                    </div>
                    <Link href={`/t/${tenant}/servicios`} className="text-sm underline underline-offset-4">
                      Ver todos
                    </Link>
                  </div>
                </FadeIn>
                <Stagger className="grid gap-3 md:grid-cols-3">
                  {(s.items ?? []).map((it, idx) => (
                    <StaggerItem
                      key={idx}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                      }}
                      className="group rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border bg-white/50">
                          <Icon name={it.icon} />
                        </span>
                        <div className="font-medium">{it.title}</div>
                      </div>
                      {it.description ? (
                        <div className="mt-1 text-sm text-muted-foreground">{it.description}</div>
                      ) : null}
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            );

          case "imageText": {
            const side = s.imageSide ?? "right";
            return (
              <section
                key={s.id}
                className="rounded-3xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10"
              >
                <div className="grid gap-6 md:grid-cols-2 md:items-center">
                  {side === "left" ? (
                    <FadeIn>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.imageUrl ?? "/builder/corp-abstract-1.svg"}
                        alt={s.imageAlt ?? ""}
                        className="w-full rounded-3xl border bg-black/10 p-3 shadow-sm"
                      />
                    </FadeIn>
                  ) : null}

                  <div>
                    {s.eyebrow ? (
                      <FadeIn>
                        <div className="inline-flex rounded-full border bg-white/50 px-3 py-1 text-xs font-medium">
                          {s.eyebrow}
                        </div>
                      </FadeIn>
                    ) : null}
                    <FadeIn delay={0.04}>
                      <h2 className="mt-3 text-2xl font-semibold">{s.title ?? "Sección"}</h2>
                    </FadeIn>
                    {s.body ? (
                      <FadeIn delay={0.08}>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground md:text-base">{s.body}</p>
                      </FadeIn>
                    ) : null}
                  </div>

                  {side === "right" ? (
                    <FadeIn>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.imageUrl ?? "/builder/corp-abstract-1.svg"}
                        alt={s.imageAlt ?? ""}
                        className="w-full rounded-3xl border bg-black/10 p-3 shadow-sm"
                      />
                    </FadeIn>
                  ) : null}
                </div>
              </section>
            );
          }

          case "about":
            return (
              <section
                key={s.id}
                className="rounded-3xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10"
              >
                <FadeIn>
                  <h2 className="text-2xl font-semibold">{s.title ?? "Sobre"}</h2>
                </FadeIn>
                {s.body ? (
                  <FadeIn delay={0.08}>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground md:text-base">{s.body}</p>
                  </FadeIn>
                ) : null}
              </section>
            );

          case "contact":
            return (
              <section
                key={s.id}
                className="rounded-3xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10"
              >
                <FadeIn>
                  <h2 className="text-2xl font-semibold">{s.title ?? "Contacto"}</h2>
                </FadeIn>
                <FadeIn delay={0.08}>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {s.email ? (
                      <div>
                        Email: <span className="text-foreground">{s.email}</span>
                      </div>
                    ) : null}
                    {s.phone ? (
                      <div>
                        Tel: <span className="text-foreground">{s.phone}</span>
                      </div>
                    ) : null}
                    {s.address ? (
                      <div>
                        Dirección: <span className="text-foreground">{s.address}</span>
                      </div>
                    ) : null}
                  </div>
                </FadeIn>
              </section>
            );

          case "cta":
            return (
              <section
                key={s.id}
                className="rounded-3xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10"
              >
                <FadeIn>
                  <h2 className="text-2xl font-semibold">{s.title ?? "¿Empezamos?"}</h2>
                </FadeIn>
                {s.text ? (
                  <FadeIn delay={0.08}>
                    <p className="mt-2 text-sm text-muted-foreground md:text-base">{s.text}</p>
                  </FadeIn>
                ) : null}
                <FadeIn delay={0.14}>
                  <Link
                    href={smartHref(tenant, s.buttonHref)}
                    className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {s.buttonText ?? "Contactar"}
                  </Link>
                </FadeIn>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
