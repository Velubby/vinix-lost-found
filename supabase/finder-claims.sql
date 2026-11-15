-- VINIX7 Lost & Found: give finders read access to the claim on their found item.
-- Run this once in Supabase Dashboard -> SQL Editor.
--
-- The claims RLS policy only lets a claimant or staff read a claim row. A finder
-- needs the status of the claim on the item they handed in, but must never see
-- the claimant's private answers or contact phone. This function returns only
-- the safe columns and only for rows whose source report belongs to auth.uid().

begin;

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
  order by c.created_at desc
  limit 1;
$$;

revoke all on function public.get_my_found_report_claim(uuid, text) from public;
revoke all on function public.get_my_found_report_claim(uuid, text) from anon;
grant execute on function public.get_my_found_report_claim(uuid, text) to authenticated;

commit;
