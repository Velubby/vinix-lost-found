-- VINIX7 Lost & Found — hardening patch for an existing Supabase project.
-- Run this once in Supabase Dashboard → SQL Editor.
--
-- Why this file exists:
--   1. The original claim trigger closed the found report and item as
--      "Selesai" the moment a claim was approved, before the physical
--      handover. This patch keeps the report in "klaim" and the item in
--      "Klaim Disetujui" until the admin marks the handover.
--   2. It stops anonymous users from reading items that frontdesk has not
--      confirmed yet, and from reading items.private_notes.
--   3. It prevents regular employees from changing their own report status
--      and from creating claims for items that are not available.
--
-- Safe to run on the current database. It does not delete reports, claims,
-- or catalog items. It does drop the unused items.private_notes column.

begin;

-- 1. Remove the unused private description copy on catalog items.
alter table public.items drop column if exists private_notes;

-- 2. Rebuild the found-item projection without private_notes.
create or replace function public.publish_found_report()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.type = 'temuan' then
    insert into public.items (
      title, category, location, found_at, image_url, description,
      status, source_report_id, created_by
    )
    values (
      new.item_title, new.category, new.location, new.incident_at,
      new.image_url, new.public_description,
      'Menunggu Penyerahan', new.id, new.user_id
    )
    on conflict (source_report_id) do update set
      title = excluded.title,
      category = excluded.category,
      location = excluded.location,
      found_at = excluded.found_at,
      image_url = excluded.image_url,
      description = excluded.description,
      status = 'Menunggu Penyerahan',
      diterima_di_pos = false;
  end if;
  return new;
end;
$$;

create or replace function public.sync_found_report_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.type = 'temuan' then
    update public.items
    set title = new.item_title,
        category = new.category,
        location = new.location,
        found_at = new.incident_at,
        image_url = new.image_url,
        description = new.public_description,
        diterima_di_pos = new.diterima_di_pos,
        status = case
          when new.status = 'klaim' then 'Menunggu Verifikasi'
          when new.status = 'selesai' then 'Selesai'
          when new.diterima_di_pos = true then 'Ditemukan'
          else status
        end
    where source_report_id = new.id;
  end if;
  return new;
end;
$$;

-- 3. Approval no longer completes the case. It reserves the item and keeps
--    the report in "klaim" until markClaimHandedOverAction closes it.
create or replace function public.handle_claim_updated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  found_report_id uuid;
  next_item_status text;
  next_report_status public.report_status;
begin
  if new.status = old.status then
    return new;
  end if;

  select source_report_id
    into found_report_id
  from public.items
  where id = new.item_id;

  -- Report first: its sync trigger runs before the final item status below.
  if found_report_id is not null then
    next_report_status := case new.status
      when 'disetujui' then 'klaim'
      when 'ditolak' then 'ditemukan'
      else 'klaim'
    end;

    update public.reports
    set status = next_report_status
    where id = found_report_id;

    insert into public.report_events (report_id, title, description, created_by)
    values (
      found_report_id,
      case new.status
        when 'disetujui' then 'Klaim disetujui'
        when 'ditolak' then 'Klaim ditolak'
        else 'Klaim sedang ditinjau'
      end,
      case new.status
        when 'disetujui' then 'Klaim kepemilikan disetujui. Barang menunggu diambil pemilik pada jam kerja kantor.'
        when 'ditolak' then 'Klaim kepemilikan ditolak. Barang kembali tersedia di katalog.'
        else 'Petugas sedang memeriksa ciri kepemilikan.'
      end,
      new.user_id
    );
  end if;

  next_item_status := case new.status
    when 'diajukan' then 'Menunggu Verifikasi'
    when 'ditinjau' then 'Menunggu Verifikasi'
    when 'disetujui' then 'Klaim Disetujui'
    when 'ditolak' then 'Ditemukan'
  end;

  update public.items
  set status = next_item_status
  where id = new.item_id;

  return new;
end;
$$;

-- 3b. App paths already insert specific timeline events (receipt, claim,
--     handover). Drop the generic duplicate status event.
drop trigger if exists on_report_status_changed on public.reports;

-- 3c. Keep the approval time separate from pickup_at and updated_at so the
--     claim history stays accurate after the item is handed over.
alter table public.claims add column if not exists approved_at timestamptz;
alter table public.claims add column if not exists handed_over_at timestamptz;

create or replace function public.set_claim_approved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'disetujui' and new.approved_at is null then
    new.approved_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_claims_approved_at on public.claims;
create trigger set_claims_approved_at
before update on public.claims
for each row execute procedure public.set_claim_approved_at();

-- 4. Catalog RLS: only published items are public. Staff and the reporter
--    can still see their own unpublished item.
drop policy if exists "Anyone can browse found items" on public.items;
create policy "Anyone can browse found items"
  on public.items for select to anon, authenticated using (
    public.is_staff()
    or diterima_di_pos = true
    or auth.uid() = created_by
  );

-- Catalog items are only created by the security-definer report trigger.
drop policy if exists "Users can create found items" on public.items;

-- 5. Employees may only edit their own draft report; non-staff cannot publish/unverify.
drop policy if exists "Users can update their reports" on public.reports;
create policy "Users can update their reports"
  on public.reports for update using (
    public.is_staff()
    or (auth.uid() = user_id and status = 'draf')
  ) with check (
    public.is_staff()
    or (auth.uid() = user_id and status = 'draf' and diterima_di_pos = false)
  );

-- 6. Claims can only be created for published, still-claimable items.
drop policy if exists "Users can create their claims" on public.claims;
create policy "Users can create their claims"
  on public.claims for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.items
      where items.id = claims.item_id
        and items.diterima_di_pos = true
        and items.status not in ('Menunggu Penyerahan', 'Klaim Disetujui', 'Selesai')
    )
  );

-- 7. Storage bucket hardening: enforce limits on public photos and keep originals private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Prevent storage.list enumeration of item-images; direct public URLs remain accessible.
drop policy if exists "Public item images are viewable" on storage.objects;

-- Private bucket for unblurred photos. Found-item photos are blurred before
-- upload, so the catalog only ever shows the blurred copy. Staff review the
-- clear copy through a server action that signs a short-lived URL.
insert into storage.buckets (id, name, public)
values ('item-originals', 'item-originals', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload original item images" on storage.objects;
create policy "Users can upload original item images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-originals'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'original'
  );

-- 8. Allow staff to write custody/timeline events (RLS was SELECT-only).
drop policy if exists "Staff can create report events" on public.report_events;
create policy "Staff can create report events"
  on public.report_events for insert to authenticated
  with check (public.is_staff());

-- 9. Prevent duplicate active claims per (item_id, user_id).
-- Fails if duplicates already exist; resolve duplicates first, then re-run.
create unique index if not exists claims_one_active_per_user_item
  on public.claims (item_id, user_id)
  where status in ('diajukan', 'ditinjau', 'disetujui');

-- 10. Prevent claimants/finder from reading others' private answers.
drop policy if exists "Report and item owners can view claims" on public.claims;
drop policy if exists "Users and staff can view claims" on public.claims;
create policy "Users and staff can view claims"
  on public.claims for select using (
    auth.uid() = user_id
    or public.is_staff()
  );

-- 11. Enforce claim.report_id to match the claimed item's source report.
create or replace function public.enforce_claim_report_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_report uuid;
begin
  select items.source_report_id
    into source_report
  from public.items
  where items.id = new.item_id;

  new.report_id := source_report;
  return new;
end;
$$;

drop trigger if exists enforce_claim_report_consistency on public.claims;
create trigger enforce_claim_report_consistency
before insert on public.claims
for each row execute procedure public.enforce_claim_report_consistency();

-- 12. Prevent claimant from rescheduling after physical handover.
create or replace function public.schedule_claim(
  claim_id uuid,
  requested_pickup_at timestamptz
)
returns public.claims
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_claim public.claims;
begin
  update public.claims
  set pickup_at = requested_pickup_at
  where id = claim_id
    and user_id = auth.uid()
    and status = 'disetujui'
    and handed_over_at is null
  returning * into updated_claim;

  if updated_claim.id is null then
    raise exception 'Klaim tidak ditemukan, belum disetujui, atau sudah diserahkan';
  end if;

  return updated_claim;
end;
$$;

grant execute on function public.schedule_claim(uuid, timestamptz) to authenticated;

-- 13. Prevent users from self-promoting profile role.
drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow maintenance/bootstrap changes from SQL contexts without an authenticated end-user session.
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role and not public.is_staff() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update on public.profiles
for each row execute procedure public.prevent_profile_role_escalation();

-- 14. Normalize claim inserts (server-enforced initial state and ticket).
create or replace function public.normalize_claim_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_ticket text;
begin
  new.status := 'diajukan';
  new.approved_at := null;
  new.pickup_at := null;
  new.pickup_location := null;
  new.handed_over_at := null;

  if new.ticket_code is null or btrim(new.ticket_code) = '' then
    generated_ticket := 'TKT-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
    new.ticket_code := generated_ticket;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_claim_insert on public.claims;
create trigger normalize_claim_insert
before insert on public.claims
for each row execute procedure public.normalize_claim_insert();

commit;
