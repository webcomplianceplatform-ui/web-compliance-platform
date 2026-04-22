"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileStack,
  SearchCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import CookieBanner from "@/components/public/CookieBanner";

const problemPoints = [
  {
    title: "Scattered across tools",
    body: "Client requests, legal notes, screenshots, and review status usually live across chat, docs, email, and spreadsheets.",
  },
  {
    title: "Hard to prove",
    body: "When a client asks what is covered, agencies often have to rebuild the story manually from different systems.",
  },
  {
    title: "Hard to follow up",
    body: "Teams know something is pending, but not which client needs action right now or what proof is still missing.",
  },
] as const;

const flowSteps = [
  {
    label: "Client",
    body: "Create one workspace per client so the agency has a clean operational record.",
    icon: Users,
  },
  {
    label: "Checklist",
    body: "Review the starter controls around cookies, privacy notice, and forms compliance.",
    icon: ClipboardList,
  },
  {
    label: "Evidence",
    body: "Attach screenshots, exports, and notes directly to the control that they support.",
    icon: FileCheck2,
  },
  {
    label: "Pack",
    body: "Generate a client-ready pack with status summary, traceability, and proof references.",
    icon: FileStack,
  },
] as const;

const differentiators = [
  {
    title: "Legal-backed logic",
    body: "The checklist is structured around real compliance controls, not a generic admin task list.",
    icon: ShieldCheck,
  },
  {
    title: "Built for agencies",
    body: "The product is organized around multiple clients, daily follow-up, and clear proof collection.",
    icon: Users,
  },
  {
    title: "Traceability by default",
    body: "Status, evidence, and pack output stay connected so agencies can explain what was reviewed and why.",
    icon: SearchCheck,
  },
] as const;

export default function LandingClient() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f7_45%,#ffffff_100%)] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <div className="text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase">WebCompliance</div>
            <div className="text-sm text-slate-600">Compliance operations for agencies</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </Link>
            <a
              href="#beta"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Request beta access
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_420px]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Agency command center
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Managing compliance for clients without chaos
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                One operational workspace for tasks, evidence, status, and traceability across every client account.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#beta"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Request beta access
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#solution"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                See the flow
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroStat label="Tasks" value="Checklist-driven" />
              <HeroStat label="Evidence" value="Linked to controls" />
              <HeroStat label="Status" value="Visible per client" />
              <HeroStat label="Traceability" value="Pack-ready" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Today</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">Agency compliance overview</div>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Attention needed
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <QuickActionCard
                client="Northlight Studio"
                items={["2 controls need review", "No evidence uploaded yet"]}
              />
              <QuickActionCard
                client="Atlas Clinic"
                items={["1 control needs review", "Follow up on stale activity"]}
              />
              <QuickActionCard
                client="Blueoak Legal"
                items={["Ready for pack review", "Evidence attached"]}
                calm
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Problem</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Compliance work is usually messy, scattered, and difficult to prove
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Agencies often already do the work. The pain is keeping it organized across multiple clients and turning
              it into something clear, traceable, and easy to explain.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {problemPoints.map((item) => (
              <InfoCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
        </section>

        <section id="solution" className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Solution</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Client to checklist to evidence to pack
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              WebCompliance gives agencies one simple flow that can be understood in minutes and used every day.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {flowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-950">{step.label}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{step.body}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Demo</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Show the flow in under 10 minutes
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              This section is ready for product screenshots or a short walkthrough video that shows the command center,
              client detail, evidence upload, and final pack output.
            </p>
          </div>

          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_320px]">
              <div className="flex min-h-[280px] items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white text-sm text-slate-500">
                Screenshot or video placeholder
              </div>
              <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-950">Suggested demo path</div>
                <DemoPoint text="Start in the agency command center and show urgent clients first." />
                <DemoPoint text="Open one client and review the checklist grouped by compliance area." />
                <DemoPoint text="Attach evidence to a control and explain the review status." />
                <DemoPoint text="Generate the evidence pack and show the proof references." />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Why it is different</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Agencies get legal-backed logic, not a generic checklist
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              The product stays focused on compliance operations: what has been reviewed, what proof exists, and what
              the agency needs to do next for each client.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {differentiators.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 w-fit">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="beta" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white md:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Request beta access</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">See the agency flow with your own client scenarios</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                  Request access and we will walk you through the core workflow: client, checklist, evidence, and pack.
                </p>
              </div>

              <form
                className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setLoading(true);
                  setError(null);

                  try {
                    const res = await fetch("/api/intake/demo", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    });
                    const data = await res.json().catch(() => null);
                    if (!res.ok || !data?.ok) {
                      setError(data?.error ?? "request_failed");
                      return;
                    }
                    setSent(true);
                    setForm({ name: "", email: "", company: "", notes: "" });
                  } catch (err: any) {
                    setError(err?.message ?? "request_failed");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <label className="block text-xs text-slate-300">
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20"
                    placeholder="Maria"
                  />
                </label>

                <label className="block text-xs text-slate-300">
                  Email
                  <input
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20"
                    placeholder="maria@agency.com"
                    type="email"
                    required
                  />
                </label>

                <label className="block text-xs text-slate-300">
                  Agency
                  <input
                    value={form.company}
                    onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20"
                    placeholder="Northlight Agency"
                  />
                </label>

                <label className="block text-xs text-slate-300">
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    className="mt-1 min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/20"
                    placeholder="Tell us about your current compliance workflow."
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Request beta access"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {sent ? <div className="text-xs text-emerald-300">Request received. We will follow up shortly.</div> : null}
                {error ? <div className="text-xs text-rose-300">We could not submit the request. Please try again.</div> : null}
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
          <div>WebCompliance for agencies</div>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="transition hover:text-slate-950">
              Login
            </Link>
            <a href="#beta" className="transition hover:text-slate-950">
              Request beta access
            </a>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}

function QuickActionCard({
  client,
  items,
  calm,
}: {
  client: string;
  items: string[];
  calm?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border p-4 ${
        calm ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-slate-950">{client}</div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            calm ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {calm ? "On track" : "Needs attention"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-white bg-white px-2.5 py-1 text-xs text-slate-600">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold text-slate-950">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
    </div>
  );
}

function DemoPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm leading-6 text-slate-600">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{text}</span>
    </div>
  );
}
