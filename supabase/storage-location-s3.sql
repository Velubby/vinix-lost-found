-- VINIX7 Lost & Found: structured storage location on reports.
-- Run this once in Supabase Dashboard -> SQL Editor.
--
-- The physical storage point for a found (or lost) item was only recorded
-- inside report event descriptions, so the tracking page could not show the
-- real location. This adds a nullable column; the tracking page, admin
-- actions, and reports queries use it from now on. No existing data changes.

begin;

alter table public.reports add column if not exists storage_location text;

commit;
