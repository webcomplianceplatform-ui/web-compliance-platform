"use client";

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
  type ElementType,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  ClipboardList,
  FileDown,
  FileText,
  Globe,
  GanttChartSquare,
  KeyRound,
  Lock,
  Menu,
  Shield,
  Sparkles,
  Ticket,
  Users,
  X,
  Zap,
  MonitorCheck,
} from "lucide-react";

type Particle = {
  id: string;
  size: number;
  left: number;
  top: number;
  opacity: number;
  duration: number;
  delay: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

type Lang = "es" | "en";

const I18N = {
  es: {
    nav_product: "Producto",
    nav_beforeafter: "Antes / Después",
    nav_usecases: "Para quién",
    nav_roles: "Roles",
    nav_security: "Seguridad",
    nav_menu: "Menú",

    login: "Login",
    request_demo: "Solicitar demo",
    open_menu: "Abrir menú",
    close: "Cerrar",
    cancel: "Cancelar",
    send: "Enviar",
    sent_ok: "Enviado ✅",
    done: "Listo",
    scroll: "Scroll",
    see_product: "Ver producto",
    see_beforeafter: "Ver antes / después",

    hero_tag: "Tenant-first · Legal · Operación · Seguridad visible",
    hero_h1_a: "Control legal, operativo y",
    hero_h1_b: "seguridad visible.",
    hero_p:
      "WebCompliance no vende webs. Vende control. Centraliza legal versionado, tickets, monitoring, auditoría, Security Alerts y evidencias. Tu web puede ser externa: el tenant existe igual.",

    stat_tenant_label: "Tenant",
    stat_tenant_value: "1 empresa",
    stat_tickets_label: "Tickets",
    stat_tickets_value: "orden",
    stat_monitoring_label: "Monitoring",
    stat_monitoring_value: "24/7",
    stat_evidence_label: "Evidencia",
    stat_evidence_value: "export",

    ba_chip: "Antes / Después",
    ba_title: "La diferencia se entiende en 5 segundos",
    ba_desc:
      "Cambia el toggle: verás cómo WebCompliance centra a todos los stakeholders (agencia, owner y cliente) alrededor de un tenant con legal, operación, seguridad y evidencias.",
    ba_without: "Sin WebCompliance",
    ba_with: "Con WebCompliance",
    ba_toggle_label: "Cambiar modo",
    ba_without_desc:
      "Mucho movimiento, poca evidencia: legal fuera de control, cambios por WhatsApp, accesos sin política y monitoring reactivo.",
    ba_with_desc:
      "Todo cae en su sitio: módulos claros, políticas por tenant (MFA), auditoría útil, Security Alerts y evidencias exportables.",
    ba_metric_control_title: "Control",
    ba_metric_control_desc: "Políticas por tenant (MFA) + reauth en acciones sensibles.",
    ba_metric_visibility_title: "Visibilidad",
    ba_metric_visibility_desc: "Audit + Alerts con contexto (solo lo que importa).",
    ba_metric_evidence_title: "Evidencia",
    ba_metric_evidence_desc: "Bundles exportables serios: audit, alerts, monitoring y legal.",

    product_chip: "Un producto, múltiples resultados",
    product_title: "El flujo que mantiene al cliente tranquilo.",
    product_desc:
      "Todo es trazable. Los clientes piden cambios por tickets, tú entregas con control, y el monitoring detecta problemas antes de que se conviertan en incidencias.",
    product_f1_t: "Peticiones estructuradas",
    product_f1_d: "Tickets por tipo, estado y prioridad.",
    product_f2_t: "Compliance por diseño",
    product_f2_d: "Legal + links en footer por tenant.",
    product_f3_t: "Control de marca",
    product_f3_d: "Tokens + imágenes, sin código a medida.",
    product_f4_t: "Always-on",
    product_f4_d: "Uptime & SSL con histórico.",

    product_block_eyebrow: "Para equipos",
    product_block_title: "Opera a escala sin perder el feeling premium",
    product_block_desc: "Permisos multi-tenant + web pública con estética de agencia.",

    pill_notifications: "Notificaciones (opcional)",
    pill_domain: "Verificación de dominio",
    pill_audit: "Audit trail",
    pill_rbac: "Role-based access",

    features_chip: "Lo que se siente cuando hay control",
    features_title: "Un producto. Seis módulos. Una sola verdad.",
    features_desc:
      "Desliza. Cada tarjeta es una pieza del control: legal, operación, visibilidad, seguridad y evidencia.",
    snap: "Snap",
    autoscroll: "Autoscroll",
    see_example: "Ver ejemplo",

    module_legal_title: "Legal versionado",
    module_legal_b1: "Aviso legal, privacidad y cookies (por tenant)",
    module_legal_b2: "Versionado + trazabilidad de cambios",
    module_legal_b3: "Servido aunque tu web sea externa",
    module_tickets_title: "Tickets & Intake",
    module_tickets_b1: "Leads, incidencias y cambios entran como tickets",
    module_tickets_b2: "Estados, prioridades, comentarios y responsables",
    module_tickets_b3: "Historial completo (sin WhatsApp)",
    module_monitor_title: "Monitoring",
    module_monitor_b1: "Uptime + SSL + Legal endpoints",
    module_monitor_b2: "Histórico y evidencias de disponibilidad",
    module_monitor_b3: "Alertas sin spam (solo transiciones)",
    module_alerts_title: "Security Alerts",
    module_alerts_b1: "Alertas accionables, no humo",
    module_alerts_b2: "Explican qué pasó, por qué importa y qué hacer",
    module_alerts_b3: "Basadas en AuditEvent (trazable)",
    module_evidence_title: "Evidence Bundles",
    module_evidence_b1: "Export serio (manifest + datasets)",
    module_evidence_b2: "Audit + alerts + monitoring + legal history",
    module_evidence_b3: "Listo para auditorías y confianza cliente",
    module_mfa_title: "MFA enforced",
    module_mfa_b1: "Política por tenant",
    module_mfa_b2: "Recovery codes",
    module_mfa_b3: "Reauth para acciones sensibles",

    mock_chip: "No vendemos teoría, vendemos paneles",
    mock_title: "Audit, Alerts y Evidence: la trilogía del control",
    mock_desc:
      "Tres pantallas que cambian la sensación del cliente: trazabilidad, seguridad visible y evidencia exportable.",
    view_demo: "Ver demo",

    usecases_chip: "Hecho para negocios de servicios",
    usecases_title: "Tu web pública, pero operativa.",
    usecases_desc:
      "Agencias, consultoras, clínicas y servicios: un sitio para web, compliance, peticiones del cliente y fiabilidad.",
    uc_1_t: "Webs de agencia",
    uc_1_d: "Entrega webs por cliente con un modelo seguro de edición.",
    uc_2_t: "Equipos legales",
    uc_2_d: "Estandariza legal sin dar acceso admin completo.",
    uc_3_t: "Mantenimiento continuo",
    uc_3_d: "Tickets como fuente única de verdad para cambios.",
    uc_4_t: "Fiabilidad",
    uc_4_d: "SSL válido y uptime visible para todos.",
    uc_5_t: "Consistencia de marca",
    uc_5_d: "Tokens + presets → experiencia consistente.",
    uc_6_t: "Seguridad",
    uc_6_d: "Roles, rate limits y auditoría, de serie.",
    learn_more: "Ver más",

    stakeholders_chip: "Una experiencia, distintos roles",
    stakeholders_title: "Cada uno ve lo que necesita.",
    stakeholders_desc: "Carrusel para mostrar cómo se adapta por rol (click para cambiar).",
    sh_owner_t: "Owner / Ops",
    sh_owner_s: "Control del día a día",
    sh_owner_b1: "Crear tickets y ver progreso",
    sh_owner_b2: "Editar bloques de la web",
    sh_owner_b3: "Gestionar usuarios del tenant",
    sh_client_t: "Cliente",
    sh_client_s: "Claridad sin poder admin",
    sh_client_b1: "Ver estado de tickets",
    sh_client_b2: "Ver uptime + SSL",
    sh_client_b3: "Pedir cambios vía Help",
    sh_super_t: "Superadmin",
    sh_super_s: "Guardrails & compliance",
    sh_super_b1: "Provisionar tenants",
    sh_super_b2: "Gestionar legal/SEO/dominios",
    sh_super_b3: "Audit logs & hardening",

    sec_card1_t: "Seguridad & hardening",
    sec_card1_d: "RBAC, rate limiting y auditoría forman parte del producto, no un añadido.",
    sec_card2_t: "Least privilege",
    sec_card2_d: "Owners gestionan el día a día. Superadmin controla legal/SEO/dominios.",
    sec_card3_t: "Rendimiento",
    sec_card3_d: "JS mínimo, cache, y monitoring diseñado para escalar.",

    cta_title: "¿Quieres ver tu tenant funcionando en 15 minutos?",
    cta_desc:
      "Te enseño el flujo real: legal versionado servido desde WebCompliance, tickets, monitoring, Security Alerts, evidencias exportables y MFA por política.",

    footer_tagline: "Control legal · Operación · Seguridad visible",
    legal_notice: "Aviso Legal",
    cookies: "Política de Cookies",
    terms: "Términos y Condiciones",
    privacy: "Política de Privacidad",
    rights: "Todos los derechos reservados.",

    modal_chip: "Solicitar demo",
    modal_title: "Te preparo un tenant real",
    modal_desc: "Sin backend todavía: esto es un formulario UI. Luego lo conectamos al Intake.",
    modal_name: "Nombre",
    modal_email: "Email",
    modal_company: "Empresa / agencia",
    modal_notes: "Qué necesitas (opcional)",
    modal_notes_ph: "Ej: quiero control legal + tickets + monitoring, sin rehacer web",
    modal_next:
      "Próximo paso: conectar este formulario al Intake (y generar ticket LEAD automáticamente).",
  },

  en: {
    nav_product: "Product",
    nav_beforeafter: "Before / After",
    nav_usecases: "Use cases",
    nav_roles: "Roles",
    nav_security: "Security",
    nav_menu: "Menu",

    login: "Login",
    request_demo: "Request demo",
    open_menu: "Open menu",
    close: "Close",
    cancel: "Cancel",
    send: "Send",
    sent_ok: "Sent ✅",
    done: "Done",
    scroll: "Scroll",
    see_product: "See product",
    see_beforeafter: "See before / after",

    hero_tag: "Tenant-first · Legal · Operations · Visible security",
    hero_h1_a: "Legal, operational and",
    hero_h1_b: "visible security control.",
    hero_p:
      "WebCompliance doesn’t sell websites. It sells control. Centralize versioned legal, tickets, monitoring, audit, Security Alerts and evidence. Your site can be external: the tenant still exists.",

    stat_tenant_label: "Tenant",
    stat_tenant_value: "1 company",
    stat_tickets_label: "Tickets",
    stat_tickets_value: "order",
    stat_monitoring_label: "Monitoring",
    stat_monitoring_value: "24/7",
    stat_evidence_label: "Evidence",
    stat_evidence_value: "export",

    ba_chip: "Before / After",
    ba_title: "You’ll get it in 5 seconds",
    ba_desc:
      "Toggle the switch: see how WebCompliance centers stakeholders (agency, owner, client) around a tenant with legal, operations, security and evidence.",
    ba_without: "Without WebCompliance",
    ba_with: "With WebCompliance",
    ba_toggle_label: "Toggle mode",
    ba_without_desc:
      "Lots of movement, little evidence: legal out of control, WhatsApp changes, access without policy and reactive monitoring.",
    ba_with_desc:
      "Everything snaps into place: clear modules, per-tenant policies (MFA), useful audit, Security Alerts and exportable evidence.",
    ba_metric_control_title: "Control",
    ba_metric_control_desc: "Per-tenant policies (MFA) + reauth for sensitive actions.",
    ba_metric_visibility_title: "Visibility",
    ba_metric_visibility_desc: "Audit + Alerts with context (only what matters).",
    ba_metric_evidence_title: "Evidence",
    ba_metric_evidence_desc: "Serious bundles: audit, alerts, monitoring and legal.",

    product_chip: "One platform, multiple outcomes",
    product_title: "The workflow that keeps clients calm.",
    product_desc:
      "Everything is traceable. Clients request changes via tickets, you deliver with control, and monitoring catches issues before they become incidents.",
    product_f1_t: "Structured requests",
    product_f1_d: "Tickets by type, status and priority.",
    product_f2_t: "Compliance by design",
    product_f2_d: "Legal pages + footer links per tenant.",
    product_f3_t: "Brand control",
    product_f3_d: "Tokens + images, not custom code.",
    product_f4_t: "Always-on",
    product_f4_d: "Uptime & SSL with history.",

    product_block_eyebrow: "For teams",
    product_block_title: "Operate at scale without losing the premium feel",
    product_block_desc:
      "Multi-tenant permissions + a public site that feels like an agency build.",

    pill_notifications: "Notifications (optional)",
    pill_domain: "Domain verification",
    pill_audit: "Audit trail",
    pill_rbac: "Role-based access",

    features_chip: "What control feels like",
    features_title: "One product. Six modules. One truth.",
    features_desc:
      "Swipe. Each card is a piece of control: legal, operations, visibility, security and evidence.",
    snap: "Snap",
    autoscroll: "Autoscroll",
    see_example: "See example",

    module_legal_title: "Versioned legal",
    module_legal_b1: "Legal notice, privacy and cookies (per tenant)",
    module_legal_b2: "Versioning + traceable changes",
    module_legal_b3: "Served even if your site is external",
    module_tickets_title: "Tickets & Intake",
    module_tickets_b1: "Leads, incidents and changes become tickets",
    module_tickets_b2: "Statuses, priorities, comments and owners",
    module_tickets_b3: "A complete history (no WhatsApp chaos)",
    module_monitor_title: "Monitoring",
    module_monitor_b1: "Uptime + SSL + Legal endpoints",
    module_monitor_b2: "History and availability evidence",
    module_monitor_b3: "No-spam alerts (only transitions)",
    module_alerts_title: "Security Alerts",
    module_alerts_b1: "Actionable alerts. No hype.",
    module_alerts_b2:
      "They explain what happened, why it matters, and what to do",
    module_alerts_b3: "Backed by AuditEvent (traceable)",
    module_evidence_title: "Evidence Bundles",
    module_evidence_b1: "Serious export (manifest + datasets)",
    module_evidence_b2: "Audit + alerts + monitoring + legal history",
    module_evidence_b3: "Ready for audits and customer trust",
    module_mfa_title: "MFA enforced",
    module_mfa_b1: "Per-tenant policy",
    module_mfa_b2: "Recovery codes",
    module_mfa_b3: "Reauth for sensitive actions",

    mock_chip: "We don’t sell theory, we sell dashboards",
    mock_title: "Audit, Alerts and Evidence: control’s trilogy",
    mock_desc:
      "Three screens that change the client’s feeling: traceability, visible security and exportable evidence.",
    view_demo: "View demo",

    usecases_chip: "Built for service businesses",
    usecases_title: "Your public site, but operational.",
    usecases_desc:
      "Agencies, consultancies, clinics and service providers: one place for the site, compliance, client requests and reliability.",
    uc_1_t: "Agency websites",
    uc_1_d: "Deliver modern sites per client with a safe editing model.",
    uc_2_t: "Legal-driven teams",
    uc_2_d: "Standardize legal content without giving full admin access.",
    uc_3_t: "Ongoing maintenance",
    uc_3_d: "Tickets become the single source of truth for changes.",
    uc_4_t: "Reliability",
    uc_4_d: "Keep SSL valid and uptime visible for everyone.",
    uc_5_t: "Brand consistency",
    uc_5_d: "Tokens + presets → consistent experience across tenants.",
    uc_6_t: "Security",
    uc_6_d: "Roles, rate limits and audit logs — out of the box.",
    learn_more: "Learn more",

    stakeholders_chip: "One experience, different roles",
    stakeholders_title: "Everyone sees what they need.",
    stakeholders_desc: "Carousel to show role-based views (click to switch).",
    sh_owner_t: "Owner / Ops",
    sh_owner_s: "Control day-to-day",
    sh_owner_b1: "Create tickets and track progress",
    sh_owner_b2: "Edit site blocks",
    sh_owner_b3: "Manage tenant users",
    sh_client_t: "Client",
    sh_client_s: "Clarity without admin power",
    sh_client_b1: "View ticket status and updates",
    sh_client_b2: "See uptime + SSL state",
    sh_client_b3: "Request changes via Help",
    sh_super_t: "Superadmin",
    sh_super_s: "Guardrails & compliance",
    sh_super_b1: "Provision tenants",
    sh_super_b2: "Manage legal/SEO/domains",
    sh_super_b3: "Audit logs & hardening",

    sec_card1_t: "Security & hardening",
    sec_card1_d:
      "RBAC, rate limiting and audit logs are part of the product — not an afterthought.",
    sec_card2_t: "Least privilege",
    sec_card2_d:
      "Owners manage day-to-day. Superadmins control legal/SEO/domains.",
    sec_card3_t: "Performance",
    sec_card3_d:
      "Minimal client JS, caching, and monitoring designed for scale.",

    cta_title: "Want your tenant running in 15 minutes?",
    cta_desc:
      "I’ll show the real flow: versioned legal served from WebCompliance, tickets, monitoring, Security Alerts, exportable evidence and policy-based MFA.",

    footer_tagline: "Legal control · Operations · Visible security",
    legal_notice: "Legal notice",
    cookies: "Cookies policy",
    terms: "Terms & conditions",
    privacy: "Privacy policy",
    rights: "All rights reserved.",

    modal_chip: "Request demo",
    modal_title: "I’ll set up a real tenant for you",
    modal_desc: "No backend yet: this is UI-only. We’ll connect it to Intake next.",
    modal_name: "Name",
    modal_email: "Email",
    modal_company: "Company / agency",
    modal_notes: "What do you need (optional)",
    modal_notes_ph:
      "e.g., legal control + tickets + monitoring, without rebuilding the site",
    modal_next:
      "Next: connect this form to Intake (and auto-create a LEAD ticket).",
  },
} as const;

type I18nKey = keyof typeof I18N["es"];

export default function LandingClient() {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });

  const t = useCallback((key: I18nKey) => I18N[lang][key], [lang]);
  // Por si algún día quieres strings inline:
  const tl = useCallback((es: string, en: string) => (lang === "es" ? es : en), [lang]);

  // Persist language
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("wc_lang");
      if (saved === "es" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("wc_lang", lang);
    } catch {}
  }, [lang]);

  // Floating particles generated after mount (avoid hydration mismatch)
  const [particles, setParticles] = useState<Particle[]>([]);

  // Cursor glow driver
  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const size = 2 + Math.random() * 5;
      arr.push({
        id: `p_${i}`,
        size,
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: 0.10 + Math.random() * 0.18,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * 4,
      });
    }
    setParticles(arr);
  }, []);

  const glowX = clamp(cursor.x, 0, 5000);
  const glowY = clamp(cursor.y, 0, 5000);

  const blobParallax = reducedMotion
    ? { x: 0, y: 0 }
    : {
        x: (glowX - viewport.w / 2) * 0.02,
        y: (glowY - viewport.h / 2) * 0.02,
      };

  const navLinks = [
    { label: t("nav_product"), href: "#product" },
    { label: t("nav_beforeafter"), href: "#beforeafter" },
    { label: t("nav_usecases"), href: "#usecases" },
    { label: t("nav_roles"), href: "#stakeholders" },
    { label: t("nav_security"), href: "#security" },
  ];

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <StickySecurityBadge t={t} />

      {/* Cursor glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          transform: `translate(${glowX - 192}px, ${glowY - 192}px)`,
          background:
            "radial-gradient(circle, rgba(206,254,130,0.16) 0%, rgba(80,106,117,0.10) 35%, transparent 70%)",
        }}
      />

      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute -left-20 top-10 h-[520px] w-[520px] rounded-full blur-3xl wc-blob"
          style={{
            transform: `translate(${blobParallax.x}px, ${blobParallax.y}px)`,
            background:
              "radial-gradient(circle, rgba(206,254,130,0.28) 0%, rgba(80,106,117,0.14) 40%, transparent 72%)",
          }}
        />
        <div
          className="absolute right-[-160px] top-[260px] h-[560px] w-[560px] rounded-full blur-3xl wc-blob wc-blob-delayed"
          style={{
            transform: `translate(${blobParallax.x * -0.8}px, ${blobParallax.y * -0.8}px)`,
            background:
              "radial-gradient(circle, rgba(80,106,117,0.30) 0%, rgba(206,254,130,0.10) 45%, transparent 75%)",
          }}
        />
        <div
          className="absolute left-1/2 top-[900px] h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl wc-blob wc-blob-slow"
          style={{
            transform: `translate(calc(-50% + ${blobParallax.x * 0.4}px), ${blobParallax.y * 0.4}px)`,
            background:
              "radial-gradient(circle, rgba(206,254,130,0.18) 0%, rgba(80,106,117,0.16) 38%, transparent 72%)",
          }}
        />
      </div>

      {/* Floating particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-white wc-float"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Subtle grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 wc-grid" />

      {/* Navbar */}
      <header className="sticky top-0 z-50">
        <div
          className={
            "mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6 " +
            (scrolled
              ? "rounded-b-3xl border border-white/10 bg-white/5 backdrop-blur-2xl"
              : "bg-transparent")
          }
        >
          <Link href="/" className="group flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-[hsl(var(--brand))]" />
            </span>
            <span className="text-sm font-semibold tracking-tight">WebCompliance</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="transition hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => setLang("es")}
                className={
                  "rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs backdrop-blur-xl transition hover:bg-white/10 " +
                  (lang === "es" ? "text-white" : "text-white/60")
                }
                aria-label="Cambiar a español"
              >
                🇪🇸
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={
                  "rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs backdrop-blur-xl transition hover:bg-white/10 " +
                  (lang === "en" ? "text-white" : "text-white/60")
                }
                aria-label="Switch to English"
              >
                🇬🇧
              </button>
            </div>

            <Link
              href="/login"
              className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 backdrop-blur-xl transition hover:bg-white/10 md:inline-flex"
            >
              {t("login")}
            </Link>

            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="group inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--brand))] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-95"
            >
              {t("request_demo")}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl transition hover:bg-white/10 md:hidden"
              aria-label={t("open_menu")}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen ? (
          <div className="mx-auto max-w-6xl px-4 pb-4 md:hidden">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white/90">{t("nav_menu")}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLang("es")}
                    className={
                      "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs backdrop-blur-xl transition hover:bg-white/10 " +
                      (lang === "es" ? "text-white" : "text-white/60")
                    }
                  >
                    🇪🇸
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={
                      "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs backdrop-blur-xl transition hover:bg-white/10 " +
                      (lang === "en" ? "text-white" : "text-white/60")
                    }
                  >
                    🇬🇧
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 backdrop-blur-xl transition hover:bg-white/10"
                  >
                    {l.label}
                  </a>
                ))}
              </div>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 backdrop-blur-xl transition hover:bg-white/10"
                >
                  {t("login")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setDemoOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--brand))] px-4 py-3 text-sm font-semibold text-slate-950"
                >
                  {t("request_demo")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
                <BadgeCheck className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
                {t("hero_tag")}
              </div>

              <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                {t("hero_h1_a")}
                <span className="block wc-animated-gradient bg-clip-text text-transparent">
                  {t("hero_h1_b")}
                </span>
              </h1>

              <p className="max-w-xl text-base leading-7 text-white/70 md:text-lg">
                {t("hero_p")}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#contact"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--brand))] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95"
                >
                  {t("request_demo")}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
                <a
                  href="#beforeafter"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/90 backdrop-blur-xl transition hover:bg-white/10"
                >
                  {t("see_beforeafter")}
                </a>
              </div>

              <div className="grid max-w-xl grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                <StatCard
                  label={t("stat_tenant_label")}
                  value={t("stat_tenant_value")}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <StatCard
                  label={t("stat_tickets_label")}
                  value={t("stat_tickets_value")}
                  icon={<Ticket className="h-4 w-4" />}
                />
                <StatCard
                  label={t("stat_monitoring_label")}
                  value={t("stat_monitoring_value")}
                  icon={<MonitorCheck className="h-4 w-4" />}
                />
                <StatCard
                  label={t("stat_evidence_label")}
                  value={t("stat_evidence_value")}
                  icon={<FileDown className="h-4 w-4" />}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.05 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
                <div className="relative rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    </div>
                    <div className="text-xs text-white/60">/app/demo</div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <MiniCard
                      title={tl("Constructor web público", "Public site builder")}
                      desc={tl("Bloques, imágenes y tokens de marca — por tenant.", "Blocks, images, and brand tokens — per tenant.")}
                      icon={<Globe className="h-4 w-4" />}
                    />
                    <MiniCard
                      title={tl("Workflow soporte", "Support workflow")}
                      desc={tl("Tickets + comentarios + audit trail.", "Tickets + comments + audit trail.")}
                      icon={<Ticket className="h-4 w-4" />}
                    />
                    <MiniCard
                      title={tl("Uptime & SSL", "Uptime & SSL")}
                      desc={tl("Eventos + histórico + alertas.", "Events + history + alerts.")}
                      icon={<MonitorCheck className="h-4 w-4" />}
                    />
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <Image
                      src="/landing/mock-dashboard.svg"
                      alt="Dashboard preview"
                      width={1200}
                      height={720}
                      className="h-auto w-full"
                      priority
                    />
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -bottom-6 -left-6 h-40 w-40 rounded-full bg-[hsl(var(--brand))]/15 blur-2xl" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-[hsl(var(--brand-2))]/25 blur-3xl" />
            </motion.div>
          </div>

          <div className="mt-10 flex items-center justify-center">
            <a href="#product" className="group inline-flex items-center gap-2 text-sm text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-xl transition group-hover:bg-white/10">
                {t("scroll")}
              </span>
              <span className="inline-block animate-bounce text-white/60">↓</span>
            </a>
          </div>
        </section>

        {/* Before / After */}
        <section id="beforeafter" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="mb-10 flex flex-col items-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
              <BadgeCheck className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
              {t("ba_chip")}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("ba_title")}</h2>
            <p className="max-w-2xl text-white/70">{t("ba_desc")}</p>
          </div>

          <BeforeAfterDiagram reducedMotion={reducedMotion} t={t} />
        </section>

        {/* Product */}
        <section id="product" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="grid gap-10 lg:grid-cols-2"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
                <GanttChartSquare className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
                {t("product_chip")}
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("product_title")}</h2>
              <p className="text-white/70">{t("product_desc")}</p>

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <FeatureCard title={t("product_f1_t")} desc={t("product_f1_d")} icon={<Ticket className="h-5 w-5" />} />
                <FeatureCard title={t("product_f2_t")} desc={t("product_f2_d")} icon={<FileText className="h-5 w-5" />} />
                <FeatureCard title={t("product_f3_t")} desc={t("product_f3_d")} icon={<Sparkles className="h-5 w-5" />} />
                <FeatureCard title={t("product_f4_t")} desc={t("product_f4_d")} icon={<MonitorCheck className="h-5 w-5" />} />
              </div>
            </div>

            <div className="space-y-4">
              <ImageTextBlock
                eyebrow={t("product_block_eyebrow")}
                title={t("product_block_title")}
                desc={t("product_block_desc")}
                imageSrc="/landing/mock-site.svg"
                imageAlt="Public site preview"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <GlassPill icon={<Bell className="h-4 w-4" />} text={t("pill_notifications")} />
                <GlassPill icon={<Globe className="h-4 w-4" />} text={t("pill_domain")} />
                <GlassPill icon={<Shield className="h-4 w-4" />} text={t("pill_audit")} />
                <GlassPill icon={<Lock className="h-4 w-4" />} text={t("pill_rbac")} />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Feature carousel */}
        <FeatureCarousel reducedMotion={reducedMotion} onOpenDemo={() => setDemoOpen(true)} t={t} />

        {/* Mock UI */}
        <MockUIPreview onOpenDemo={() => setDemoOpen(true)} t={t} />

        {/* Use cases */}
        <motion.section
          id="usecases"
          className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-10 flex items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
                <Zap className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
                {t("usecases_chip")}
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("usecases_title")}</h2>
              <p className="max-w-2xl text-white/70">{t("usecases_desc")}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: t("uc_1_t"), desc: t("uc_1_d"), icon: <Globe className="h-5 w-5" /> },
              { title: t("uc_2_t"), desc: t("uc_2_d"), icon: <FileText className="h-5 w-5" /> },
              { title: t("uc_3_t"), desc: t("uc_3_d"), icon: <Ticket className="h-5 w-5" /> },
              { title: t("uc_4_t"), desc: t("uc_4_d"), icon: <MonitorCheck className="h-5 w-5" /> },
              { title: t("uc_5_t"), desc: t("uc_5_d"), icon: <Sparkles className="h-5 w-5" /> },
              { title: t("uc_6_t"), desc: t("uc_6_d"), icon: <Shield className="h-5 w-5" /> },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.06 }}
              >
                <div className="group h-full rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/10">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[hsl(var(--brand))]">
                      {c.icon}
                    </div>
                    <div className="text-base font-semibold">{c.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/70">{c.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/60">
                    {t("learn_more")}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Stakeholders carousel */}
        <section id="stakeholders" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
              {t("stakeholders_chip")}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("stakeholders_title")}</h2>
            <p className="max-w-2xl text-white/70">{t("stakeholders_desc")}</p>
          </div>

          <StakeholdersCarousel reducedMotion={reducedMotion} t={t} />
        </section>

        {/* Security */}
        <section id="security" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-6 lg:grid-cols-3">
            <SecurityCard icon={<Shield className="h-5 w-5" />} title={t("sec_card1_t")} desc={t("sec_card1_d")} />
            <SecurityCard icon={<Lock className="h-5 w-5" />} title={t("sec_card2_t")} desc={t("sec_card2_d")} />
            <SecurityCard icon={<Zap className="h-5 w-5" />} title={t("sec_card3_t")} desc={t("sec_card3_d")} />
          </div>
        </section>

        {/* CTA */}
        <section id="contact" className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-6">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl md:p-12">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5" />
            <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t("cta_title")}</h3>
                <p className="mt-2 text-white/70">{t("cta_desc")}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--brand))] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95"
                >
                  {t("request_demo")}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
                <a
                  href="#product"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/90 backdrop-blur-xl transition hover:bg-white/10"
                >
                  {t("see_product")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-slate-950/40">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-white/60 md:px-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--brand))]" />
                </span>
                <div>
                  <div className="text-white">WebCompliance</div>
                  <div className="text-xs text-white/50">{t("footer_tagline")}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a className="hover:text-white" href="#product">{t("nav_product")}</a>
                <a className="hover:text-white" href="#security">{t("nav_security")}</a>
                <Link className="hover:text-white" href="/login">{t("login")}</Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/50">
              <a className="hover:text-white" href="/t/webcompliance/legal/aviso-legal">
                {t("legal_notice")}
              </a>
              <span className="text-white/30">|</span>
              <a className="hover:text-white" href="/t/webcompliance/legal/politica-de-cookies">
                {t("cookies")}
              </a>
              <span className="text-white/30">|</span>
              <a className="hover:text-white" href="/t/webcompliance/legal/terminos-y-condiciones">
                {t("terms")}
              </a>
              <span className="text-white/30">|</span>
              <a className="hover:text-white" href="/t/webcompliance/legal/politica-de-privacidad">
                {t("privacy")}
              </a>
            </div>

            <div className="mt-8 text-xs text-white/40">
              © {new Date().getFullYear()} WebCompliance. {t("rights")}
            </div>
          </div>
        </footer>

        <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} t={t} />
      </main>
    </div>
  );
}

function StickySecurityBadge({ t }: { t: (k: I18nKey) => string }) {
  return (
    <a
      href="#security"
      className={
        "fixed bottom-5 right-5 z-50 hidden md:block " +
        "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-2xl shadow-lg " +
        "transition hover:-translate-y-0.5 hover:bg-white/10"
      }
      aria-label="Ver Security & Hardening"
    >
      <div className="flex items-center gap-3">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/20">
          <span className="absolute inset-0 rounded-xl bg-[hsl(var(--brand))]/10" />
          <BadgeCheck className="relative h-5 w-5 text-[hsl(var(--brand))]" />
        </span>
        <div className="min-w-[210px]">
          <div className="text-sm font-semibold">{t("module_alerts_title")}</div>
          <div className="text-xs text-white/70">{t("sec_card1_t")}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-white/60" />
      </div>
    </a>
  );
}

function BeforeAfterDiagram({ reducedMotion, t }: { reducedMotion: boolean; t: (k: I18nKey) => string }) {
  const [mode, setMode] = useState<"without" | "with">("with");

  type Pos = { x: number; y: number; r?: number; s?: number };
  type Node = {
    id: string;
    label: string;
    Icon: ElementType;
    ordered: Pos;
    chaos: Pos;
    tone: "neutral" | "good" | "bad";
  };

  const content =
    mode === "with"
      ? {
          headline: t("ba_with"),
          description: t("ba_with_desc"),
          metrics: [
            { title: t("ba_metric_control_title"), desc: t("ba_metric_control_desc") },
            { title: t("ba_metric_visibility_title"), desc: t("ba_metric_visibility_desc") },
            { title: t("ba_metric_evidence_title"), desc: t("ba_metric_evidence_desc") },
          ],
        }
      : {
          headline: t("ba_without"),
          description: t("ba_without_desc"),
          metrics: [
            { title: "No traceability", desc: "No one knows what happened, when, and by whom." },
            { title: "Invisible risk", desc: "No actionable alerts and no useful audit." },
            { title: "No evidence", desc: "You can’t prove control to clients or auditors." },
          ],
        };

  const nodes: Node[] = useMemo(
    () => [
      {
        id: "agency",
        label: "Agencia / Proveedor",
        Icon: Users,
        ordered: { x: 8, y: 16 },
        chaos: { x: 14, y: 18, r: -12, s: 0.92 },
        tone: "neutral",
      },
      {
        id: "owner",
        label: "Owner (empresa)",
        Icon: Building2,
        ordered: { x: 8, y: 32 },
        chaos: { x: 22, y: 44, r: 14, s: 0.9 },
        tone: mode === "with" ? "good" : "bad",
      },
      {
        id: "legal",
        label: mode === "with" ? t("module_legal_title") : "Legal sin versionado",
        Icon: FileText,
        ordered: { x: 8, y: 50 },
        chaos: { x: 34, y: 84, r: -18, s: 0.88 },
        tone: mode === "with" ? "good" : "bad",
      },
      {
        id: "tickets",
        label: t("module_tickets_title"),
        Icon: Ticket,
        ordered: { x: 8, y: 68 },
        chaos: { x: 56, y: 40, r: 18, s: 0.9 },
        tone: mode === "with" ? "good" : "bad",
      },
      {
        id: "audit",
        label: mode === "with" ? "Audit útil" : "Sin auditoría",
        Icon: ClipboardList,
        ordered: { x: 8, y: 84 },
        chaos: { x: 10, y: 84, r: -10, s: 0.9 },
        tone: mode === "with" ? "good" : "bad",
      },
      {
        id: "website",
        label: "Web externa / propia",
        Icon: Globe,
        ordered: { x: 92, y: 16 },
        chaos: { x: 90, y: 14, r: 12, s: 0.92 },
        tone: "neutral",
      },
      {
        id: "client",
        label: "Cliente final",
        Icon: Users,
        ordered: { x: 92, y: 32 },
        chaos: { x: 78, y: 26, r: -16, s: 0.9 },
        tone: "neutral",
      },
      {
        id: "monitor",
        label: t("module_monitor_title"),
        Icon: Activity,
        ordered: { x: 92, y: 50 },
        chaos: { x: 84, y: 58, r: 16, s: 0.9 },
        tone: mode === "with" ? "good" : "bad",
      },
      {
        id: "mfa",
        label: t("module_mfa_title"),
        Icon: KeyRound,
        ordered: { x: 92, y: 68 },
        chaos: { x: 58, y: 90, r: -10, s: 0.86 },
        tone: mode === "with" ? "good" : "bad",
      },
      {
        id: "evidence",
        label: mode === "with" ? t("module_evidence_title") : "Sin evidencias",
        Icon: FileDown,
        ordered: { x: 92, y: 84 },
        chaos: { x: 84, y: 92, r: -8, s: 0.86 },
        tone: mode === "with" ? "good" : "bad",
      },
    ],
    [mode, t]
  );

  const pillTone = (tone: Node["tone"]) => {
    if (tone === "good") return "border-emerald-400/30 bg-emerald-400/10";
    if (tone === "bad") return "border-rose-400/30 bg-rose-400/10";
    return "border-white/15 bg-white/5";
  };

  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl md:p-10">
      {/* Toggle */}
      <div className="mx-auto mb-8 flex w-full max-w-xl items-center justify-center gap-3">
        <span className={"text-sm " + (mode === "without" ? "text-white" : "text-white/50")}>
          {t("ba_without")}
        </span>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "with" ? "without" : "with"))}
          className="relative h-9 w-16 rounded-full border border-white/15 bg-white/10 p-1 transition hover:bg-white/15"
          aria-label={t("ba_toggle_label")}
        >
          <span
            className={
              "block h-7 w-7 rounded-full bg-white/90 shadow transition-transform duration-300 " +
              (mode === "with" ? "translate-x-7" : "translate-x-0")
            }
          />
        </button>

        <span className={"text-sm " + (mode === "with" ? "text-white" : "text-white/50")}>
          {t("ba_with")}
        </span>
      </div>

      {/* Desktop diagram */}
      <div className="relative hidden h-[520px] md:block">
        <svg aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
          {nodes.map((n) => {
            const p = mode === "with" ? n.ordered : n.chaos;
            const cx = 50;
            const cy = 52;
            return (
              <motion.path
                key={n.id}
                d={`M ${p.x} ${p.y} C ${(p.x + cx) / 2} ${p.y}, ${(p.x + cx) / 2} ${cy}, ${cx} ${cy}`}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={mode === "with" ? 1 : 1.6}
                initial={false}
                animate={{ opacity: mode === "with" ? 0.35 : 0.7 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            );
          })}

          {mode === "without" &&
            [
              ["agency", "tickets"],
              ["owner", "monitor"],
              ["legal", "website"],
              ["tickets", "client"],
              ["audit", "mfa"],
              ["monitor", "evidence"],
              ["client", "agency"],
            ].map(([a, b], i) => {
              const na = nodes.find((x) => x.id === a)!;
              const nb = nodes.find((x) => x.id === b)!;
              const pa = na.chaos;
              const pb = nb.chaos;
              const midx = (pa.x + pb.x) / 2;
              const midy = (pa.y + pb.y) / 2;
              return (
                <motion.path
                  key={`x_${i}`}
                  d={`M ${pa.x} ${pa.y} C ${midx} ${pa.y}, ${midx} ${pb.y}, ${pb.x} ${pb.y}`}
                  fill="none"
                  stroke="rgba(160,190,255,0.22)"
                  strokeWidth={1.8}
                  initial={false}
                  animate={{ opacity: 0.8 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              );
            })}
        </svg>

        <motion.div
          initial={false}
          animate={{ opacity: mode === "without" ? 1 : 0, scale: mode === "without" ? 1 : 0.98 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0"
        >
          {["WhatsApp", "Excel", "Email", "PDF", "Reuniones", "Notas", "Llamadas"].map((tt, i) => (
            <div
              key={tt}
              className="absolute rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur-xl"
              style={{
                left: `${12 + (i * 11) % 76}%`,
                top: `${18 + ((i * 17) % 66)}%`,
                transform: `rotate(${(i % 2 ? 1 : -1) * (8 + i)}deg)`,
              }}
            >
              {tt}
            </div>
          ))}
        </motion.div>

        {nodes.map((n) => {
          const p = mode === "with" ? n.ordered : n.chaos;
          return (
            <motion.div
              key={n.id}
              initial={false}
              animate={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                rotate: reducedMotion ? 0 : p.r ?? 0,
                scale: p.s ?? 1,
                opacity: mode === "without" && (n.id === "tickets" || n.id === "monitor") ? 0.85 : 1,
              }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className={
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl " +
                pillTone(n.tone)
              }
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/20">
                  <n.Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{n.label}</span>
              </div>
            </motion.div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 z-30 w-[520px] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="mx-auto inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <Shield className="h-6 w-6 text-[hsl(var(--brand))]" />
            </span>
            <span className="text-base font-semibold">WebCompliance</span>
          </div>

          <motion.h3
            key={content.headline}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-5 text-3xl font-extrabold tracking-tight"
          >
            {content.headline}
          </motion.h3>

          <motion.p
            key={content.description}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: reducedMotion ? 0 : 0.05 }}
            className="mt-3 text-sm leading-relaxed text-white/70"
          >
            {content.description}
          </motion.p>

          <div className="mt-8 grid w-full grid-cols-3 gap-4">
            {mode === "with"
              ? content.metrics.map((m) => (
                  <div
                    key={m.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <div className="text-lg font-semibold">{m.title}</div>
                    <div className="mt-1 text-sm text-white/70">{m.desc}</div>
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>

      {/* Mobile (scaled canvas, no scroll) */}
      <div className="md:hidden">
        <MobileBeforeAfter
          mode={mode}
          reducedMotion={reducedMotion}
          nodes={nodes}
          pillTone={pillTone}
          content={content}
        />
      </div>

      {/* Decorative rings */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      </div>

      {/* Color accents */}
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-[hsl(var(--brand))]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[hsl(var(--brand-2))]/30 blur-3xl" />
    </div>
  );
}

function MobileBeforeAfter({
  mode,
  reducedMotion,
  nodes,
  pillTone,
  content,
}: {
  mode: "without" | "with";
  reducedMotion: boolean;
  nodes: Array<{
    id: string;
    label: string;
    Icon: ElementType;
    ordered: { x: number; y: number; r?: number; s?: number };
    chaos: { x: number; y: number; r?: number; s?: number };
    tone: "neutral" | "good" | "bad";
  }>;
  pillTone: (tone: "neutral" | "good" | "bad") => string;
  content: { headline: string; description: string; metrics: Array<{ title: string; desc: string }> };
}) {
  const CANVAS_W = 980;
  const CANVAS_H = 520;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [wrapW, setWrapW] = useState<number>(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setWrapW(el.clientWidth);
    });
    ro.observe(el);
    setWrapW(el.clientWidth);

    return () => ro.disconnect();
  }, []);

  // scale real (número), no calc()
  const scale = useMemo(() => {
    // restamos nada porque el wrapper ya está dentro de px-4 del layout
    const s = wrapW > 0 ? wrapW / CANVAS_W : 1;
    // clamp para evitar cosas raras en pantallas muy pequeñas
    return Math.max(0.28, Math.min(1, s));
  }, [wrapW]);

  const scaledH = Math.round(CANVAS_H * scale);

  return (
    <div className="relative" ref={wrapRef}>
      {/* ✅ Altura REAL del canvas escalado, evita solape con la sección siguiente */}
      <div className="relative w-full overflow-hidden" style={{ height: scaledH }}>
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
          }}
        >
          <div className="relative h-[520px]">
            <svg aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
              {nodes.map((n) => {
                const p = mode === "with" ? n.ordered : n.chaos;
                const cx = 50;
                const cy = 52;
                return (
                  <motion.path
                    key={n.id}
                    d={`M ${p.x} ${p.y} C ${(p.x + cx) / 2} ${p.y}, ${(p.x + cx) / 2} ${cy}, ${cx} ${cy}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={mode === "with" ? 1 : 1.6}
                    initial={false}
                    animate={{ opacity: mode === "with" ? 0.35 : 0.7 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                );
              })}
            </svg>

            <motion.div
              initial={false}
              animate={{ opacity: mode === "without" ? 1 : 0, scale: mode === "without" ? 1 : 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0"
            >
              {["WhatsApp", "Excel", "Email", "PDF", "Reuniones", "Notas", "Llamadas"].map((tt, i) => (
                <div
                  key={tt}
                  className="absolute rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur-xl"
                  style={{
                    left: `${12 + (i * 11) % 76}%`,
                    top: `${18 + ((i * 17) % 66)}%`,
                    transform: `rotate(${(i % 2 ? 1 : -1) * (8 + i)}deg)`,
                  }}
                >
                  {tt}
                </div>
              ))}
            </motion.div>

            {nodes.map((n) => {
              const p = mode === "with" ? n.ordered : n.chaos;
              return (
                <motion.div
                  key={n.id}
                  initial={false}
                  animate={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    rotate: reducedMotion ? 0 : p.r ?? 0,
                    scale: p.s ?? 1,
                  }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                  className={
                    "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl " +
                    pillTone(n.tone)
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/20">
                      <n.Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium">{n.label}</span>
                  </div>
                </motion.div>
              );
            })}

            <div className="absolute left-1/2 top-1/2 z-30 w-[520px] -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="mx-auto inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                  <Shield className="h-6 w-6 text-[hsl(var(--brand))]" />
                </span>
                <span className="text-base font-semibold">WebCompliance</span>
              </div>
              <div className="mt-5 text-3xl font-extrabold tracking-tight">{content.headline}</div>
              <div className="mt-3 text-sm leading-relaxed text-white/70">{content.description}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ En mobile: métricas SOLO en modo "with" */}
      {mode === "with" ? (
        <div className="mt-5 grid gap-3">
          {content.metrics.map((m) => (
            <div key={m.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="text-sm font-semibold">{m.title}</div>
              <div className="mt-1 text-sm text-white/70">{m.desc}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}


function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="text-[hsl(var(--brand))]">{icon}</span>
      </div>
      <div className="mt-1 text-lg font-bold tracking-tight text-white">{value}</div>
    </div>
  );
}

function MiniCard({ title, desc, icon }: { title: string; desc: string; icon: ReactNode }) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all duration-500 hover:bg-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-[hsl(var(--brand))]">{icon}</div>
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <Zap className="h-4 w-4 text-white/40 transition group-hover:text-white/70" />
      </div>
      <div className="mt-2 text-xs leading-5 text-white/60">{desc}</div>
    </div>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: ReactNode }) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/10">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[hsl(var(--brand))] transition group-hover:scale-110">
          {icon}
        </div>
        <div className="text-base font-semibold">{title}</div>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/70">{desc}</p>
    </div>
  );
}

function GlassPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75 backdrop-blur-xl">
      <span className="text-[hsl(var(--brand))]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function ImageTextBlock({
  eyebrow,
  title,
  desc,
  imageSrc,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  imageSrc: string;
  imageAlt: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
          {eyebrow}
        </div>
        <div className="mt-4 text-xl font-extrabold tracking-tight md:text-2xl">{title}</div>
        <p className="mt-2 text-sm leading-6 text-white/70">{desc}</p>
      </div>
      <div className="border-t border-white/10 bg-slate-950/20 p-4">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={1200}
          height={720}
          className="h-auto w-full rounded-2xl border border-white/10"
        />
      </div>
    </div>
  );
}

function StakeholdersCarousel({ reducedMotion, t }: { reducedMotion: boolean; t: (k: I18nKey) => string }) {
  const items = useMemo(
    () => [
      {
        title: t("sh_owner_t"),
        subtitle: t("sh_owner_s"),
        icon: <Building2 className="h-5 w-5" />,
        bullets: [t("sh_owner_b1"), t("sh_owner_b2"), t("sh_owner_b3")],
      },
      {
        title: t("sh_client_t"),
        subtitle: t("sh_client_s"),
        icon: <Bell className="h-5 w-5" />,
        bullets: [t("sh_client_b1"), t("sh_client_b2"), t("sh_client_b3")],
      },
      {
        title: t("sh_super_t"),
        subtitle: t("sh_super_s"),
        icon: <Shield className="h-5 w-5" />,
        bullets: [t("sh_super_b1"), t("sh_super_b2"), t("sh_super_b3")],
      },
    ],
    [t]
  );

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setActive((a) => (a + 1) % items.length), 5200);
    return () => window.clearInterval(timer);
  }, [items.length, reducedMotion]);

  return (
    <div className="relative">
      <div className="relative h-[420px] w-full">
        {items.map((it, i) => {
          const leftIndex = (active - 1 + items.length) % items.length;
          const rightIndex = (active + 1) % items.length;

          const isCenter = i === active;
          const isLeft = i === leftIndex;
          const isRight = i === rightIndex;

          let transform = "translate(-50%, -50%) scale(0.7)";
          let z = 10;
          let blur = "blur-sm";
          let opacity = "opacity-70";

          if (isCenter) {
            transform = "translate(-50%, -50%) scale(1)";
            z = 30;
            blur = "blur-0";
            opacity = "opacity-100";
          } else if (isLeft) {
            transform = "translate(calc(-50% - 320px), -50%) scale(0.82) rotateY(18deg)";
            z = 20;
          } else if (isRight) {
            transform = "translate(calc(-50% + 320px), -50%) scale(0.82) rotateY(-18deg)";
            z = 20;
          } else {
            transform = "translate(-50%, -50%) scale(0.7)";
            z = 0;
          }

          return (
            <button
              key={it.title}
              type="button"
              onClick={() => setActive(i)}
              className={
                "absolute left-1/2 top-1/2 w-[320px] cursor-pointer select-none rounded-[2rem] border border-white/10 bg-white/5 p-6 text-left backdrop-blur-2xl transition-all duration-700 " +
                blur +
                " " +
                opacity +
                " hover:bg-white/10"
              }
              style={{ transform, transformStyle: "preserve-3d", zIndex: z }}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[hsl(var(--brand))]">
                  {it.icon}
                </div>
                <div>
                  <div className="text-base font-bold">{it.title}</div>
                  <div className="text-xs text-white/60">{it.subtitle}</div>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {it.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand))]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={
              "h-2.5 w-2.5 rounded-full transition " +
              (i === active ? "bg-[hsl(var(--brand))]" : "bg-white/20 hover:bg-white/30")
            }
            aria-label={`Select ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureCarousel({
  reducedMotion,
  onOpenDemo,
  t,
}: {
  reducedMotion: boolean;
  onOpenDemo: () => void;
  t: (k: I18nKey) => string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  const items = useMemo(
    () => [
      {
        key: "legal",
        title: t("module_legal_title"),
        icon: <FileText className="h-5 w-5" />,
        bullets: [t("module_legal_b1"), t("module_legal_b2"), t("module_legal_b3")],
        badge: "COMPLIANCE",
      },
      {
        key: "tickets",
        title: t("module_tickets_title"),
        icon: <Ticket className="h-5 w-5" />,
        bullets: [t("module_tickets_b1"), t("module_tickets_b2"), t("module_tickets_b3")],
        badge: "OPS",
      },
      {
        key: "monitoring",
        title: t("module_monitor_title"),
        icon: <Activity className="h-5 w-5" />,
        bullets: [t("module_monitor_b1"), t("module_monitor_b2"), t("module_monitor_b3")],
        badge: "VISIBILITY",
      },
      {
        key: "alerts",
        title: t("module_alerts_title"),
        icon: <BadgeCheck className="h-5 w-5" />,
        bullets: [t("module_alerts_b1"), t("module_alerts_b2"), t("module_alerts_b3")],
        badge: "SECURITY",
      },
      {
        key: "evidence",
        title: t("module_evidence_title"),
        icon: <FileDown className="h-5 w-5" />,
        bullets: [t("module_evidence_b1"), t("module_evidence_b2"), t("module_evidence_b3")],
        badge: "EVIDENCE",
      },
      {
        key: "mfa",
        title: t("module_mfa_title"),
        icon: <KeyRound className="h-5 w-5" />,
        bullets: [t("module_mfa_b1"), t("module_mfa_b2"), t("module_mfa_b3")],
        badge: "HARDENING",
      },
    ],
    [t]
  );

  useEffect(() => {
    if (reducedMotion) return;
    if (paused) return;
    const el = scrollerRef.current;
    if (!el) return;

    const tick = () => {
      const card = el.querySelector<HTMLElement>("[data-card='feature']");
      const step = (card?.offsetWidth ?? 340) + 16;
      const max = el.scrollWidth - el.clientWidth - 8;
      const next = el.scrollLeft + step;
      el.scrollTo({ left: next >= max ? 0 : next, behavior: "smooth" });
    };

    const timer = window.setInterval(tick, 4200);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  return (
    <motion.section
      id="features"
      className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
            {t("features_chip")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("features_title")}</h2>
          <p className="max-w-2xl text-white/70">{t("features_desc")}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDemo}
            className="group inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--brand))] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-95"
          >
            {t("request_demo")}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="relative -mx-4 overflow-x-auto px-4 pb-6 pr-10 [scrollbar-width:none]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex snap-x snap-mandatory gap-4">
          {items.map((it) => (
            <div key={it.key} data-card="feature" className="group w-[86%] shrink-0 snap-center sm:w-[520px]">
              <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/10">
                <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
                  <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[hsl(var(--brand))]/10 blur-3xl" />
                  <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[hsl(var(--brand-2))]/12 blur-3xl" />
                </div>

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[hsl(var(--brand))] transition group-hover:scale-110">
                      {it.icon}
                    </div>
                    <div>
                      <div className="text-base font-bold">{it.title}</div>
                      <div className="mt-1 text-xs text-white/60">{it.badge}</div>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {t("snap")}
                  </div>
                </div>

                <ul className="relative mt-5 space-y-2 text-sm text-white/75">
                  {it.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand))]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-6 flex items-center gap-2 text-sm text-white/60">
                  {t("see_example")}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 backdrop-blur-2xl md:block">
          {t("autoscroll")}
        </div>
      </div>
    </motion.section>
  );
}

function MockUIPreview({ onOpenDemo, t }: { onOpenDemo: () => void; t: (k: I18nKey) => string }) {
  return (
    <motion.section
      id="mock"
      className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
            <ClipboardList className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
            {t("mock_chip")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("mock_title")}</h2>
          <p className="max-w-2xl text-white/70">{t("mock_desc")}</p>
        </div>

        <button
          type="button"
          onClick={onOpenDemo}
          className="group inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 backdrop-blur-xl transition hover:bg-white/10"
        >
          {t("view_demo")}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MockWindow
          title="Audit"
          icon={<ClipboardList className="h-4 w-4" />}
          subtitle={t("module_alerts_b3")}
          lines={[
            "OWNER updated plan · CONFIG",
            "OWNER enabled MFA policy · SECURITY",
            "SUPERADMIN impersonated tenant · ACCESS",
            "OWNER exported evidence bundle · OPS",
          ]}
        />
        <MockWindow
          title={t("module_alerts_title")}
          icon={<BadgeCheck className="h-4 w-4" />}
          subtitle={t("module_alerts_b2")}
          lines={[
            "HIGH · MFA disabled for tenant",
            "HIGH · Role elevation detected",
            "MED · SSL expiring soon (7d)",
            "LOW · Legal page changed",
          ]}
          accent
        />
        <MockWindow
          title={t("module_evidence_title")}
          icon={<FileDown className="h-4 w-4" />}
          subtitle={t("module_evidence_b1")}
          lines={["manifest.json", "audit_events.csv", "security_alerts.csv", "monitor_events.csv"]}
        />
      </div>
    </motion.section>
  );
}

function MockWindow({
  title,
  subtitle,
  icon,
  lines,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  lines: string[];
  accent?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/10">
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden>
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[hsl(var(--brand))]/10 blur-3xl" />
        {accent ? (
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(var(--brand-2))]/14 blur-3xl" />
        ) : null}
      </div>

      <div className="relative border-b border-white/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[hsl(var(--brand))] transition group-hover:scale-110">
              {icon}
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-1 text-xs text-white/60">{subtitle}</div>
            </div>
          </div>
          <div className="text-xs text-white/50">/app</div>
        </div>
      </div>

      <div className="relative p-5">
        <div className="space-y-2">
          {lines.map((l, idx) => (
            <div
              key={l}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-white/75"
              style={{ transitionDelay: `${idx * 60}ms` }}
            >
              <span className="truncate">{l}</span>
              <span className="ml-3 text-white/40">→</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Read-only</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Exportable</span>
        </div>
      </div>
    </div>
  );
}

function SecurityCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[hsl(var(--brand))]">{icon}</div>
        <div className="text-lg font-semibold">{title}</div>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/70">{desc}</p>
    </div>
  );
}

function DemoModal({ open, onClose, t }: { open: boolean; onClose: () => void; t: (k: I18nKey) => string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", notes: "" });

  useEffect(() => {
    if (!open) {
      setSent(false);
      setLoading(false);
      setError(null);
      setForm({ name: "", email: "", company: "", notes: "" });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div className="relative mx-auto mt-20 w-[92%] max-w-xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[hsl(var(--brand))]/14 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(var(--brand-2))]/16 blur-3xl" />
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
                {t("modal_chip")}
              </div>
              <div className="mt-3 text-xl font-extrabold tracking-tight md:text-2xl">{t("modal_title")}</div>
              <div className="mt-1 text-sm text-white/70">{t("modal_desc")}</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              {t("close")}
            </button>
          </div>

          <div className="relative mt-6">
            {sent ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-base font-semibold">{t("sent_ok")}</div>
                <div className="mt-2 text-sm text-white/70">{t("modal_next")}</div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl bg-[hsl(var(--brand))] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-95"
                  >
                    {t("done")}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/intake/demo", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    });
                    const j = await res.json().catch(() => null);
                    if (!res.ok || !j?.ok) {
                      setError(j?.error ?? "request_failed");
                      return;
                    }
                    setSent(true);
                  } catch (err: any) {
                    setError(err?.message ?? "request_failed");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="grid gap-3"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-white/70">
                    {t("modal_name")}
                    <input
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/10"
                      placeholder="Gonzalo"
                    />
                  </label>
                  <label className="text-xs text-white/70">
                    {t("modal_email")}
                    <input
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/10"
                      placeholder="you@company.com"
                      type="email"
                      required
                    />
                  </label>
                </div>

                <label className="text-xs text-white/70">
                  {t("modal_company")}
                  <input
                    value={form.company}
                    onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/10"
                    placeholder="Mi Agencia S.L."
                  />
                </label>

                <label className="text-xs text-white/70">
                  {t("modal_notes")}
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                    className="mt-1 min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/10"
                    placeholder={t("modal_notes_ph")}
                  />
                </label>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 backdrop-blur-xl transition hover:bg-white/10"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-2xl bg-[hsl(var(--brand))] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? "..." : t("send")}
                  </button>
                </div>

                {error ? <div className="text-xs text-rose-200">{String(error)}</div> : null}

                <div className="mt-2 text-xs text-white/50">{t("modal_next")}</div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
