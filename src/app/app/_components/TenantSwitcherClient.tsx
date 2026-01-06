"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TenantListItem = {
  slug: string;
  name: string;
  status: string;
  role: string;
};

export default function TenantSwitcherClient({ tenants }: { tenants: TenantListItem[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...tenants].sort((a, b) => a.slug.localeCompare(b.slug));
  }, [tenants]);

  async function createTenant() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/app/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const e = data?.error ?? "unknown_error";
        if (e === "invalid_slug") setError("Slug inválido. Usa solo letras/números y guiones (ej: acme, mi-empresa)." );
        else if (e === "slug_taken") setError("Ese slug ya existe. Elige otro.");
        else if (e === "missing_fields") setError("Rellena slug y nombre.");
        else setError("No se pudo crear el tenant.");
        return;
      }
      router.push(`/app/${data.slug}`);
      router.refresh();
    } catch {
      setError("Error de red al crear el tenant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Tus tenants</h1>
        <p className="text-sm text-muted-foreground">Entra en un tenant o crea uno nuevo.</p>
      </div>

      <div className="grid gap-4">
        {sorted.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No tienes tenants todavía</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Crea tu primer tenant abajo.
            </CardContent>
          </Card>
        ) : (
          sorted.map((t) => (
            <Card key={t.slug}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-muted-foreground">
                    /app/{t.slug} · {t.role} · {t.status}
                  </div>
                </div>
                <Button onClick={() => router.push(`/app/${t.slug}`)}>Entrar</Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Slug (URL)</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="mi-empresa"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <p className="text-xs text-muted-foreground">Solo letras/números y guiones. Sin espacios.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Empresa S.L." />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button disabled={loading} onClick={createTenant}>
            {loading ? "Creando…" : "Crear"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
