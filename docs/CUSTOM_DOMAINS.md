# Custom domains (design)

This document describes the **design** for supporting multiple domain models per tenant.

## Domain models (can be packages)

1) **Path-based (Basic)**
- Public site: `https://platform.com/t/<tenant>`
- No DNS.
- Great for MVP, demos, and low-touch clients.

2) **Subdomain (Pro)**
- Public site: `https://<tenant>.platform.com`
- Requires wildcard DNS (`*.platform.com`) pointing to Vercel.
- Tenants are resolved from the request host.

3) **Custom client domain (Premium / White-label)**
- Public site: `https://www.client.com` (and/or `https://client.com`)
- Requires DNS changes on the client side + domain verification.

All three can coexist:
- `/t/<tenant>` remains the fallback/preview.
- `<tenant>.platform.com` is optional per tenant.
- Custom domains are optional per tenant.

---

## Tenant resolution strategy

### Current (today)
- Public routes resolve tenant from URL param: `/t/[tenant]`.

### Next (with domains)
- For public website routes we add an additional resolver:

**If host matches:**
- `<tenant>.platform.com` → tenant = `<tenant>`
- `custom-domain.com` → look up which tenant owns that hostname

**Else:**
- Use the existing path-based routes (`/t/[tenant]`).

> Private app (`/app/...`) stays unchanged. It continues to use `tenant` from the URL.

---

## Suggested database shape

Keep it explicit (auditable) and future-proof:

```prisma
model TenantDomain {
  id        String   @id @default(cuid())
  tenantId  String
  hostname  String   @unique
  kind      TenantDomainKind @default(CUSTOM)
  status    TenantDomainStatus @default(PENDING)

  // verification (depends on provider)
  verificationToken String?
  verifiedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

enum TenantDomainKind {
  SUBDOMAIN
  CUSTOM
}

enum TenantDomainStatus {
  PENDING
  VERIFIED
  FAILED
}
```

And in `Tenant`:

```prisma
domains TenantDomain[]
```

---

## Vercel configuration (high level)

### Subdomains
- Create wildcard DNS record:
  - `*.platform.com` → Vercel
- Configure the Vercel project to accept wildcard subdomains.
- Tenant is derived from `Host` header.

### Custom domains
- Provide UI to add a hostname (e.g. `www.client.com`).
- Show instructions:
  - Add CNAME to your Vercel target (or A record for apex if supported)
- Verify domain ownership:
  - Either via Vercel Domain API verification flow
  - Or via DNS TXT token (provider-agnostic)

---

## Next.js implementation approach (high level)

### A) Add a public “host-based” router
Option 1 (recommended): a dedicated public app segment, e.g. `/site` that renders the same components as `/t/[tenant]`, but resolves tenant from `host`.

Option 2: keep `/t/[tenant]` and add middleware rewrites for custom domains:
- If request host matches a tenant → rewrite `/` → `/t/<tenant>`

This lets the same pages render for both models.

### B) Middleware responsibilities
- Detect `Host`
- Map host → tenant slug (from cache/DB)
- Rewrite to `/t/<tenant>/...`

### C) Caching
- Cache host→tenant mapping (e.g. in memory for MVP; later Redis)
- TTL ~ 60s–5m

---

## Security & edge cases

- Do not allow claiming internal domains.
- Enforce normalization (lowercase, strip trailing dot).
- Prevent duplicate hostnames across tenants.
- Handle www/apex pairing as separate hostnames or automatic pairing.

---

## Planned implementation milestones

1) **Design + docs (this step)**
2) Add `TenantDomain` model + basic CRUD (superadmin / tenant owner)
3) Add middleware rewrite for subdomain + custom domain
4) Add verification workflow (Vercel API or DNS token)
5) Add packages/features + billing hook (later)
