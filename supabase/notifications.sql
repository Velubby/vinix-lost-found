-- VINIX7 Lost & Found: notification ownership patch for an existing project.
-- Run this once in Supabase Dashboard -> SQL Editor.
--
-- Report and claim notifications are now written by the admin server actions.
-- The old triggers wrote a second notification for the same transition, so this
-- patch removes them. No report, claim, or item data is changed.

begin;

drop trigger if exists on_notify_report_status_changed on public.reports;
drop trigger if exists on_notify_claim_status_changed on public.claims;

drop function if exists public.notify_report_status_changed();
drop function if exists public.notify_claim_status_changed();

commit;
