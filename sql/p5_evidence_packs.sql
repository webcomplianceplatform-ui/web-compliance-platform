begin;

-- Evidence Pack Schedule
create table if not exists public."EvidencePackSchedule" (
  id text not null default (gen_random_uuid())::text,
  "tenantId" text not null unique,
  enabled boolean not null default true,
  frequency text not null default 'MONTHLY',
  "dayOfMonth" integer not null default 1,
  hour integer not null default 9,
  timezone text not null default 'Europe/Madrid',
  recipients jsonb,
  "lastRunAt" timestamp with time zone,
  "nextRunAt" timestamp with time zone,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint "EvidencePackSchedule_pkey" primary key (id),
  constraint "EvidencePackSchedule_tenantId_fkey" foreign key ("tenantId") references public."Tenant"(id) on delete cascade
);

create index if not exists "EvidencePackSchedule_enabled_nextRunAt_idx" on public."EvidencePackSchedule" (enabled, "nextRunAt");

-- Evidence Pack
create table if not exists public."EvidencePack" (
  id text not null default (gen_random_uuid())::text,
  "tenantId" text not null,
  "periodStart" timestamp with time zone not null,
  "periodEnd" timestamp with time zone not null,
  format text not null default 'pdf',
  "manifestHash" text,
  "metaJson" jsonb,
  "createdAt" timestamp with time zone not null default now(),
  constraint "EvidencePack_pkey" primary key (id),
  constraint "EvidencePack_tenantId_fkey" foreign key ("tenantId") references public."Tenant"(id) on delete cascade
);

create index if not exists "EvidencePack_tenantId_createdAt_idx" on public."EvidencePack" ("tenantId", "createdAt" desc);

commit;
