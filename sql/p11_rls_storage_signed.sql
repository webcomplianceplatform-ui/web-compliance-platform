begin;

-- Helper functions (membership + admin)

create or replace function public.is_tenant_member(tid text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public."UserTenant" ut
    where ut."tenantId" = tid
      and ut."userId" = auth.uid()::text
  );
$$;

create or replace function public.is_tenant_admin(tid text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public."UserTenant" ut
    where ut."tenantId" = tid
      and ut."userId" = auth.uid()::text
      and ut."role" in ('OWNER','ADMIN')
  );
$$;

-- =========================
-- App tables: EvidencePack / EvidencePackSchedule
-- =========================

alter table public."EvidencePack" enable row level security;
alter table public."EvidencePackSchedule" enable row level security;

drop policy if exists "wc_evidencepack_select" on public."EvidencePack";
drop policy if exists "wc_evidencepack_insert" on public."EvidencePack";
drop policy if exists "wc_evidencepack_update" on public."EvidencePack";
drop policy if exists "wc_evidencepack_delete" on public."EvidencePack";

create policy "wc_evidencepack_select"
on public."EvidencePack"
for select
using (
  auth.role() = 'service_role'
  or public.is_tenant_member("tenantId")
);

create policy "wc_evidencepack_insert"
on public."EvidencePack"
for insert
with check (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
);

create policy "wc_evidencepack_update"
on public."EvidencePack"
for update
using (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
)
with check (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
);

create policy "wc_evidencepack_delete"
on public."EvidencePack"
for delete
using (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
);

drop policy if exists "wc_evidencepackschedule_select" on public."EvidencePackSchedule";
drop policy if exists "wc_evidencepackschedule_insert" on public."EvidencePackSchedule";
drop policy if exists "wc_evidencepackschedule_update" on public."EvidencePackSchedule";
drop policy if exists "wc_evidencepackschedule_delete" on public."EvidencePackSchedule";

create policy "wc_evidencepackschedule_select"
on public."EvidencePackSchedule"
for select
using (
  auth.role() = 'service_role'
  or public.is_tenant_member("tenantId")
);

create policy "wc_evidencepackschedule_insert"
on public."EvidencePackSchedule"
for insert
with check (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
);

create policy "wc_evidencepackschedule_update"
on public."EvidencePackSchedule"
for update
using (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
)
with check (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
);

create policy "wc_evidencepackschedule_delete"
on public."EvidencePackSchedule"
for delete
using (
  auth.role() = 'service_role'
  or public.is_tenant_admin("tenantId")
);

-- =========================
-- Storage policies for bucket evidence-packs (PRIVATE)
-- Path: <tenantId>/packs/<packId>.pdf
-- Signed URL downloads work without granting public read.
-- =========================

alter table storage.objects enable row level security;

drop policy if exists "wc_storage_evidence_packs_service_role" on storage.objects;
drop policy if exists "wc_storage_evidence_packs_member_read" on storage.objects;

-- Service role: full access (upload, delete, sign)
create policy "wc_storage_evidence_packs_service_role"
on storage.objects
for all
using (
  auth.role() = 'service_role'
  and bucket_id = 'evidence-packs'
)
with check (
  auth.role() = 'service_role'
  and bucket_id = 'evidence-packs'
);

-- Optional: authenticated tenant members can read objects directly (still not public)
create policy "wc_storage_evidence_packs_member_read"
on storage.objects
for select
using (
  auth.role() = 'authenticated'
  and bucket_id = 'evidence-packs'
  and public.is_tenant_member(split_part(name, '/', 1))
  and name like (split_part(name,'/',1) || '/packs/%')
);

commit;
