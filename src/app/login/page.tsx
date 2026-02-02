"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AppCard } from "@/components/app-ui/AppCard";
import { AppButton } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => {
    const raw = searchParams.get("callbackUrl") || "/app";
    return raw.startsWith("/") ? raw : "/app";
  }, [searchParams]);

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: brand / pitch */}
        <div className="md:max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-bg1 px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--brand))]" />
            <span className="text-muted-foreground">WebCompliance Platform</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Accede a tu panel
            <span className="text-brand"> con estilo</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
            Tickets, monitoring, web pública y compliance por tenant. Todo en un solo sitio.
          </p>

          <div className="mt-6 hidden grid-cols-2 gap-3 md:grid">
            <div className="glass rounded-2xl p-4">
              <div className="text-sm font-medium">Multi-tenant</div>
              <div className="mt-1 text-xs text-muted-foreground">Separación total por cliente</div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="text-sm font-medium">Observability</div>
              <div className="mt-1 text-xs text-muted-foreground">Uptime + SSL + histórico</div>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="w-full md:max-w-sm">
          <AppCard className="rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Login</h2>
              <div className="rounded-full border bg-bg1 px-3 py-1 text-xs text-muted-foreground">
                Secure
              </div>
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setLoading(true);
                try {
                  await signIn("credentials", {
                    email,
                    password,
                    callbackUrl,
                  });
                } catch (err) {
                  setError("No se pudo iniciar sesión");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <label className="block text-xs font-medium text-muted-foreground">Email</label>
              <AppInput
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />

              <label className="block text-xs font-medium text-muted-foreground">Password</label>
              <AppInput
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
              />

              <AppButton type="submit" disabled={loading} className="mt-2 w-full">
                {loading ? "Entrando…" : "Entrar"}
              </AppButton>

              {error ? (
                <div className="rounded-2xl border bg-bg1 p-3 text-xs text-muted-foreground">
                  {error}
                </div>
              ) : null}

              <div className="pt-2 text-xs text-muted-foreground">
                ¿Necesitas ayuda? Pide acceso a tu administrador.
              </div>
            </form>
          </AppCard>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
