-- VINIX7 Lost & Found: claim decision notes and losing-claim closure.
-- Run this once in Supabase Dashboard -> SQL Editor.
--
-- 1. A losing claim gets its own "ditutup" status instead of reusing "ditolak".
-- 2. Staff decisions store a claimant-visible note in claims.decision_note.
-- 3. The claim trigger ignores "ditutup" so it cannot reopen an item that the
--    winning claim already reserved or handed over.

begin;

alter type public.claim_status add value if not exists 'ditutup';

alter table public.claims add column if not exists decision_note text;

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

  -- Compared as text because the enum value may be added in this transaction.
  if new.status::text = 'ditutup' then
    return new;
  end if;

  select source_report_id
    into found_report_id
  from public.items
  where id = new.item_id;

  -- Update the report first so its sync trigger runs before the final item
  -- status is written below. Approval keeps the report in "klaim" until the
  -- handover action closes it, so "disetujui" never means "already picked up".
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

-- Prefer the winning claim when several claims exist for one found item.
create or replace function public.get_my_found_report_claim(
  p_report_id uuid default null,
  p_ticket_code text default null
)
returns table (
  id uuid,
  item_id uuid,
  report_id uuid,
  status public.claim_status,
  ticket_code text,
  pickup_location text,
  pickup_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  is_claim_owner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.item_id,
    c.report_id,
    c.status,
    c.ticket_code,
    c.pickup_location,
    c.pickup_at,
    c.reviewed_at,
    c.approved_at,
    c.created_at,
    c.updated_at,
    c.user_id = auth.uid() as is_claim_owner
  from public.claims c
  join public.items i on i.id = c.item_id
  join public.reports r on r.id = i.source_report_id
  where r.user_id = auth.uid()
    and (p_report_id is null or r.id = p_report_id)
    and (p_ticket_code is null or lower(c.ticket_code) = lower(p_ticket_code))
  order by (c.status = 'disetujui') desc, c.created_at desc
  limit 1;
$$;

revoke all on function public.get_my_found_report_claim(uuid, text) from public;
revoke all on function public.get_my_found_report_claim(uuid, text) from anon;
grant execute on function public.get_my_found_report_claim(uuid, text) to authenticated;

commit;
