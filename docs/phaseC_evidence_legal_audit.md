# Phase C — Audit consistency + Evidence Bundles v2 + Legal endpoint monitoring

## 1) Audit consistency (Owner/Admin)

### Goal
Audit should capture **state-changing actions** that impact risk/control.

### Category convention
All new/updated audit events should include:

```json
{ "category": "SECURITY" | "CONFIG" | "OPS" | "LEGAL" | "ACCESS" }
```

### Updated endpoints
- Tenant user management (`/app/[tenant]/tenants/[tenant]/users`):
  - `tenant.user.add` → metaJson: `{category:"SECURITY", role, email}`
  - `tenant.user.role.update` → metaJson: `{category:"SECURITY", fromRole, toRole, elevation}`
  - `tenant.user.remove` → metaJson: `{category:"SECURITY"}`
- Admin tenant plan update (`/api/admin/tenant-plan`):
  - `tenant.plan.update` → metaJson includes `{category:"CONFIG", ...}`

## 2) Evidence bundles (export serio)

### Endpoint
`GET /api/app/security/evidence/export?tenant=<slug>&days=90&format=json`

- Default: JSON bundle
- CSV modes:
  - `format=csv&kind=audit`
  - `format=csv&kind=alerts`

### Output includes
- manifest (range + counts)
- auditEvents
- securityAlerts
- monitorEvents + monitorChecks
- legalHistory (versioned)
- digest (grouped counts)

## 3) Legal endpoint monitoring

### Behaviour
When legal settings are updated and Monitoring module is enabled:
- A monitoring check is ensured for:
  `/t/<tenant>/legal/aviso-legal`
- Stored as a MonitorCheck with `metaJson.kind = "LEGAL"`

### Anti-spam
Operational SecurityAlerts are created only on:
- first run, or
- status transition (previous != current)

Alert message example:
- `Legal endpoint unreachable: <url>`
