-- =========================
-- WebCompliance P11: RLS for Evidence Packs + Storage policies
-- Requires: UserTenant table maps app users to tenants.
-- Notes:
-- - Supabase service_role bypasses RLS (server-side operations keep working).
-- - These policies protect access when using anon/authenticated keys.
-- =========================

begin;

-- 0) Helper functions (idempotent)
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
      and upper(ut."role"::text) in ('OWNER','ADMIN')
  );
$$;

-- 1) EvidencePack table: enable RLS
alter table if exists public."EvidencePack" enable row level security;

-- Read: any tenant member can read packs (including client-scoped packs)
drop policy if exists "EvidencePack_select_member" on public."EvidencePack";
create policy "EvidencePack_select_member"
on public."EvidencePack"
for select
to authenticated
using (public.is_tenant_member("tenantId"));

-- Insert: only tenant admins (typically your app creates packs server-side)
drop policy if exists "EvidencePack_insert_admin" on public."EvidencePack";
create policy "EvidencePack_insert_admin"
on public."EvidencePack"
for insert
to authenticated
with check (public.is_tenant_admin("tenantId"));

-- Update: only tenant admins; additionally, prevent editing finalized packs in SQL (best-effort)
drop policy if exists "EvidencePack_update_admin" on public."EvidencePack";
create policy "EvidencePack_update_admin"
on public."EvidencePack"
for update
to authenticated
using (public.is_tenant_admin("tenantId"))
with check (public.is_tenant_admin("tenantId"));

-- Delete: only tenant admins
drop policy if exists "EvidencePack_delete_admin" on public."EvidencePack";
create policy "EvidencePack_delete_admin"
on public."EvidencePack"
for delete
to authenticated
using (public.is_tenant_admin("tenantId"));

-- 2) EvidencePackSchedule table: enable RLS
alter table if exists public."EvidencePackSchedule" enable row level security;

drop policy if exists "EvidencePackSchedule_select_member" on public."EvidencePackSchedule";
create policy "EvidencePackSchedule_select_member"
on public."EvidencePackSchedule"
for select
to authenticated
using (public.is_tenant_member("tenantId"));

drop policy if exists "EvidencePackSchedule_mutate_admin" on public."EvidencePackSchedule";
create policy "EvidencePackSchedule_mutate_admin"
on public."EvidencePackSchedule"
for all
to authenticated
using (public.is_tenant_admin("tenantId"))
with check (public.is_tenant_admin("tenantId"));

-- 3) Storage policies (Supabase Storage)
-- Assumptions:
-- - bucket_id = 'evidence-packs' (or your env EVIDENCE_BUCKET).
-- - object name format: '<tenantId>/packs/<file>.pdf'
-- If you use a different bucket, replace 'evidence-packs' accordingly.

-- Make sure RLS is enabled on storage.objects (it is by default in Supabase).
-- Read/download: tenant members can read objects in their tenant prefix.
drop policy if exists "evidence_packs_read_member" on storage.objects;
create policy "evidence_packs_read_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidence-packs'
  and public.is_tenant_member( split_part(name, '/', 1) )
);

-- Upload: only tenant admins can upload into their prefix (client-side upload). Server uses service_role anyway.
drop policy if exists "evidence_packs_write_admin" on storage.objects;
create policy "evidence_packs_write_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidence-packs'
  and public.is_tenant_admin( split_part(name, '/', 1) )
);

-- Optional: block deletes client-side except admins.
drop policy if exists "evidence_packs_delete_admin" on storage.objects;
create policy "evidence_packs_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidence-packs'
  and public.is_tenant_admin( split_part(name, '/', 1) )
);

commit;

-- Optional hardening (manual):
-- You can add a DB trigger to prevent updates to finalized packs:
--   - if OLD.finalizedAt is not null then raise exception
