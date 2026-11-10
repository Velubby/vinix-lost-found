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

-- 5. Employees may only edit their own draft report; admins keep full access.
drop policy if exists "Users can update their reports" on public.reports;
create policy "Users can update their reports"
  on public.reports for update using (
    public.is_staff()
    or (auth.uid() = user_id and status = 'draf')
  ) with check (public.is_staff() or auth.uid() = user_id);

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

commit;

-- Optional, after checking for duplicates:
--   select item_id, user_id, count(*)
--   from public.claims
--   where status in ('diajukan', 'ditinjau', 'disetujui')
--   group by item_id, user_id
--   having count(*) > 1;
-- If the result is empty, enable the database-level duplicate guard:
--
-- create unique index if not exists claims_one_active_per_user_item
--   on public.claims (item_id, user_id)
--   where status in ('diajukan', 'ditinjau', 'disetujui');
