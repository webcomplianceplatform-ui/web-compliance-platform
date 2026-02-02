"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultTheme, type SiteSection, type TenantTheme } from "@/lib/theme";
import { AppButton } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppCard } from "@/components/app-ui/AppCard";

type PageKey = "home" | "services" | "about" | "contact";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-h-[120px] w-full rounded-2xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
    />
  );
}

function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "mt-1 w-full rounded-2xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2",
        className
      )}
    >
      {children}
    </select>
  );
}

const TAB_ACTIVE = "border-transparent bg-[#dbf676] text-black";
const TAB_INACTIVE = "text-foreground hover:bg-[#dbf676] hover:text-black";

function SideItem({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3 py-2 text-left transition",
        "hover:-translate-y-[1px] hover:shadow-sm",
        active ? TAB_ACTIVE : `bg-transparent ${TAB_INACTIVE}`
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </button>
  );
}

function ensureBuilder(theme: TenantTheme): TenantTheme {
  return {
    ...theme,
    siteBuilder: {
      ...(theme.siteBuilder ?? {}),
      pages: {
        ...((theme.siteBuilder?.pages ?? {}) as any),
        home: (theme.siteBuilder?.pages?.home ?? []) as any,
        services: (theme.siteBuilder?.pages?.services ?? []) as any,
        about: (theme.siteBuilder?.pages?.about ?? []) as any,
        contact: (theme.siteBuilder?.pages?.contact ?? []) as any,
      },
    },
  };
}

function createSection(type: SiteSection["type"]): SiteSection {
  switch (type) {
    case "hero":
      return {
        id: uid("hero"),
        type: "hero",
        layout: "split",
        headline: "Tu web corporativa, con look premium y base legal",
        subheadline: "Builder por bloques + soporte por tickets + monitoring Uptime/SSL.",
        ctaText: "Pedir demo",
        ctaHref: "/contacto",
        imageUrl: "/builder/corp-hero.svg",
      };
    case "features":
      return {
        id: uid("features"),
        type: "features",
        title: "Por qué funciona",
        items: [
          { title: "Rápida", icon: "Zap", description: "Carga rápido y se siente producto." },
          { title: "Legal-ready", icon: "Shield", description: "Avisos, privacidad y cookies por tenant." },
          { title: "Operable", icon: "Wrench", description: "Tickets + roles + auditoría." },
        ],
      };
    case "services":
      return {
        id: uid("services"),
        type: "services",
        title: "Servicios",
        items: [
          { title: "Web corporativa", icon: "Layout", description: "Landing premium con componentes." },
          { title: "Compliance", icon: "Scale", description: "Legal + cookies con control centralizado." },
          { title: "Mantenimiento", icon: "Ticket", description: "Solicitudes y cambios por ticket." },
        ],
      };
    case "imageText":
      return {
        id: uid("imagetext"),
        type: "imageText",
        eyebrow: "Diseño + operación",
        title: "Una sección visual tipo corporate",
        body: "Bloque con imagen + texto para contar tu propuesta de valor de forma más visual.",
        imageUrl: "/builder/corp-abstract-1.svg",
        imageAlt: "Abstract SaaS illustration",
        imageSide: "right",
      };
    case "about":
      return {
        id: uid("about"),
        type: "about",
        title: "Sobre nosotros",
        body: "Describe aquí tu propuesta de valor.\n\nEsto se puede editar por tenant desde el panel.",
      };
    case "contact":
      return {
        id: uid("contact"),
        type: "contact",
        title: "Contacto",
        email: "contacto@tu-negocio.com",
      };
    case "cta":
      return {
        id: uid("cta"),
        type: "cta",
        title: "¿Lo montamos?",
        text: "Cuéntame tu caso y te digo el plan.",
        buttonText: "Pedir info",
        buttonHref: "/contacto",
      };
    default:
      return { id: uid("section"), type: "cta" };
  }
}

function CardHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="text-base font-semibold">{title}</div>
        {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export default function SiteBuilderClient({ tenant }: { tenant: string }) {
  const [page, setPage] = useState<PageKey>("home");
  const [theme, setTheme] = useState<TenantTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const [resTheme, resSite] = await Promise.all([
          fetch(`/api/app/settings/theme?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store" }),
          fetch(`/api/app/settings/site-builder?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store" }),
        ]);
        const dataTheme = await resTheme.json();
        const dataSite = await resSite.json();

        const baseTheme = (dataTheme.ok && dataTheme.theme ? (dataTheme.theme as TenantTheme) : defaultTheme) as TenantTheme;
        const sb = dataSite.ok ? (dataSite.siteBuilder as any) : null;

        const merged = { ...(baseTheme as any), ...(sb ? { siteBuilder: sb } : {}) } as TenantTheme;
        setTheme(ensureBuilder(merged));
      } catch {
        setTheme(ensureBuilder(defaultTheme));
        setMsg("No se pudo cargar el contenido (usando defaults).");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenant]);

  const sections = useMemo(() => {
    const t = ensureBuilder(theme);
    return (t.siteBuilder?.pages?.[page] ?? []) as SiteSection[];
  }, [theme, page]);

  const setSections = (next: SiteSection[]) => {
    setTheme((t) => {
      const base = ensureBuilder(t);
      return {
        ...base,
        siteBuilder: {
          ...(base.siteBuilder ?? {}),
          pages: {
            ...(base.siteBuilder?.pages ?? {}),
            [page]: next,
          } as any,
        },
      };
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/app/settings/site-builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, siteBuilder: (theme as any).siteBuilder }),
      });
      const data = await res.json();
      setMsg(data.ok ? "Guardado ✅" : `Error: ${data.error ?? "error"}`);
    } catch {
      setMsg("Error: no se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setSections(next);
  };

  const remove = (index: number) => {
    const next = sections.filter((_, i) => i !== index);
    setSections(next);
  };

  const add = (type: SiteSection["type"]) => {
    setSections([...sections, createSection(type)]);
  };

  const patchSection = (index: number, patch: Partial<SiteSection>) => {
    const next = sections.map((s, i) => (i === index ? ({ ...s, ...patch } as SiteSection) : s));
    setSections(next);
  };

  const patchItem = (
    index: number,
    itemIndex: number,
    patch: { title?: string; description?: string; icon?: string }
  ) => {
    const s = sections[index];
    if (s.type !== "features" && s.type !== "services") return;
    const items = [...(s.items ?? [])];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    patchSection(index, { items } as any);
  };

  const addItem = (index: number) => {
    const s = sections[index];
    if (s.type !== "features" && s.type !== "services") return;
    const items = [...(s.items ?? []), { title: "Nuevo", description: "", icon: "Sparkles" }];
    patchSection(index, { items } as any);
  };

  const removeItem = (index: number, itemIndex: number) => {
    const s = sections[index];
    if (s.type !== "features" && s.type !== "services") return;
    const items = (s.items ?? []).filter((_, i) => i !== itemIndex);
    patchSection(index, { items } as any);
  };

  const publicUrl = useMemo(() => `/t/${tenant}`, [tenant]);

  if (loading) {
    return (
      <main className="space-y-4">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Site Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea tu web pública por bloques para <span className="font-mono">{tenant}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            className="hidden rounded-xl border px-3 py-2 text-sm transition hover:bg-[#dbf676] hover:text-black md:inline-flex"
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ver site ↗
          </a>
          <AppButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </AppButton>
        </div>
      </div>

      {msg ? <div className="glass rounded-xl px-4 py-3 text-sm">{msg}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <AppCard className="p-4">
            <CardHeader title="Páginas" description="Elige qué página editar." />
            <div className="mt-3 space-y-2">
              <SideItem active={page === "home"} title="Home" description="Landing principal" onClick={() => setPage("home")} />
              <SideItem active={page === "services"} title="Servicios" description="/servicios" onClick={() => setPage("services")} />
              <SideItem active={page === "about"} title="Sobre" description="/sobre" onClick={() => setPage("about")} />
              <SideItem active={page === "contact"} title="Contacto" description="/contacto" onClick={() => setPage("contact")} />
            </div>
          </AppCard>

          <AppCard className="p-4">
            <CardHeader title="Añadir bloque" description="Se añaden al final (luego puedes reordenar)." />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <AppButton variant="secondary" onClick={() => add("hero")}>Hero</AppButton>
              <AppButton variant="secondary" onClick={() => add("features")}>Features</AppButton>
              <AppButton variant="secondary" onClick={() => add("services")}>Services</AppButton>
              <AppButton variant="secondary" onClick={() => add("imageText")}>Image+Text</AppButton>
              <AppButton variant="secondary" onClick={() => add("about")}>About</AppButton>
              <AppButton variant="secondary" onClick={() => add("contact")}>Contact</AppButton>
              <AppButton variant="secondary" onClick={() => add("cta")}>CTA</AppButton>
            </div>
          </AppCard>
        </aside>

        <section className="space-y-4">
          {sections.length === 0 ? (
            <AppCard className="p-5">
              <CardHeader title="No hay bloques" description="Añade bloques desde la izquierda para construir la página." />
            </AppCard>
          ) : null}

          {sections.map((s, idx) => (
            <AppCard key={s.id} className="p-5">
              <CardHeader
                title={`Bloque ${idx + 1}`}
                description={
                  <>
                    <span className="mr-2 inline-flex rounded-full border px-2 py-1 text-xs">{s.type}</span>
                    ID: <span className="font-mono">{s.id}</span>
                  </>
                }
                right={
                  <div className="flex items-center gap-2">
                    <AppButton variant="secondary" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</AppButton>
                    <AppButton variant="secondary" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1}>↓</AppButton>
                    <AppButton variant="danger" onClick={() => remove(idx)}>Delete</AppButton>
                  </div>
                }
              />

              <div className="mt-4 space-y-3">
                {s.type === "hero" ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Layout</div>
                        <Select
                          value={(s.layout ?? "split") as any}
                          onChange={(v) => patchSection(idx, { layout: v as any } as any)}
                        >
                          <option value="split">Split (texto + imagen)</option>
                          <option value="background">Background</option>
                        </Select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-xs text-muted-foreground">Image URL (split)</div>
                        <AppInput
                          className="mt-1"
                          value={s.imageUrl ?? ""}
                          onChange={(e) => patchSection(idx, { imageUrl: e.target.value } as any)}
                          placeholder="/builder/corp-hero.svg"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Background URL (optional)</div>
                      <AppInput
                        className="mt-1"
                        value={s.backgroundUrl ?? ""}
                        onChange={(e) => patchSection(idx, { backgroundUrl: e.target.value } as any)}
                        placeholder="/builder/your-bg.svg"
                      />
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Headline</div>
                      <AppInput className="mt-1" value={s.headline ?? ""} onChange={(e) => patchSection(idx, { headline: e.target.value } as any)} />
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Subheadline</div>
                      <Textarea value={s.subheadline ?? ""} onChange={(v) => patchSection(idx, { subheadline: v } as any)} />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">CTA text</div>
                        <AppInput className="mt-1" value={s.ctaText ?? ""} onChange={(e) => patchSection(idx, { ctaText: e.target.value } as any)} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">CTA href</div>
                        <AppInput className="mt-1" value={s.ctaHref ?? ""} onChange={(e) => patchSection(idx, { ctaHref: e.target.value } as any)} placeholder="/contacto" />
                      </div>
                    </div>
                  </div>
                ) : null}

                {s.type === "features" || s.type === "services" ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Title</div>
                      <AppInput className="mt-1" value={s.title ?? ""} onChange={(e) => patchSection(idx, { title: e.target.value } as any)} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Items</div>
                        <AppButton variant="secondary" onClick={() => addItem(idx)}>Add item</AppButton>
                      </div>

                      {(s.items ?? []).map((it, j) => (
                        <div key={j} className="rounded-2xl border border-border bg-bg2/30 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">Item {j + 1}</div>
                            <AppButton variant="danger" onClick={() => removeItem(idx, j)}>Remove</AppButton>
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-3">
                            <AppInput
                              value={it.icon ?? ""}
                              onChange={(e) => patchItem(idx, j, { icon: e.target.value })}
                              placeholder="Icon (e.g. Shield, Zap, Ticket)"
                            />
                            <AppInput
                              value={it.title ?? ""}
                              onChange={(e) => patchItem(idx, j, { title: e.target.value })}
                              placeholder="Título"
                            />
                            <AppInput
                              value={it.description ?? ""}
                              onChange={(e) => patchItem(idx, j, { description: e.target.value })}
                              placeholder="Descripción"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {s.type === "imageText" ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Eyebrow (badge)</div>
                        <AppInput className="mt-1" value={s.eyebrow ?? ""} onChange={(e) => patchSection(idx, { eyebrow: e.target.value } as any)} placeholder="e.g. Diseño + operación" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Image side</div>
                        <Select value={s.imageSide ?? "right"} onChange={(v) => patchSection(idx, { imageSide: v as any } as any)}>
                          <option value="right">Right</option>
                          <option value="left">Left</option>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Title</div>
                      <AppInput className="mt-1" value={s.title ?? ""} onChange={(e) => patchSection(idx, { title: e.target.value } as any)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Body</div>
                      <Textarea value={s.body ?? ""} onChange={(v) => patchSection(idx, { body: v } as any)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Image URL</div>
                      <AppInput className="mt-1" value={s.imageUrl ?? ""} onChange={(e) => patchSection(idx, { imageUrl: e.target.value } as any)} placeholder="/builder/corp-abstract-1.svg" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Image alt</div>
                      <AppInput className="mt-1" value={s.imageAlt ?? ""} onChange={(e) => patchSection(idx, { imageAlt: e.target.value } as any)} placeholder="Illustration" />
                    </div>
                  </div>
                ) : null}

                {s.type === "about" ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Title</div>
                      <AppInput className="mt-1" value={s.title ?? ""} onChange={(e) => patchSection(idx, { title: e.target.value } as any)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Body</div>
                      <Textarea value={s.body ?? ""} onChange={(v) => patchSection(idx, { body: v } as any)} />
                    </div>
                  </div>
                ) : null}

                {s.type === "contact" ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Title</div>
                      <AppInput className="mt-1" value={s.title ?? ""} onChange={(e) => patchSection(idx, { title: e.target.value } as any)} />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <AppInput className="mt-1" value={s.email ?? ""} onChange={(e) => patchSection(idx, { email: e.target.value } as any)} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Phone</div>
                        <AppInput className="mt-1" value={s.phone ?? ""} onChange={(e) => patchSection(idx, { phone: e.target.value } as any)} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Address</div>
                      <AppInput className="mt-1" value={s.address ?? ""} onChange={(e) => patchSection(idx, { address: e.target.value } as any)} />
                    </div>
                  </div>
                ) : null}

                {s.type === "cta" ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Title</div>
                      <AppInput className="mt-1" value={s.title ?? ""} onChange={(e) => patchSection(idx, { title: e.target.value } as any)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Text</div>
                      <Textarea value={s.text ?? ""} onChange={(v) => patchSection(idx, { text: v } as any)} />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Button text</div>
                        <AppInput className="mt-1" value={s.buttonText ?? ""} onChange={(e) => patchSection(idx, { buttonText: e.target.value } as any)} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Button href</div>
                        <AppInput className="mt-1" value={s.buttonHref ?? ""} onChange={(e) => patchSection(idx, { buttonHref: e.target.value } as any)} placeholder="/contacto" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </AppCard>
          ))}
        </section>
      </div>
    </main>
  );
}
