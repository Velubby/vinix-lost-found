-- VINIX7 Lost & Found — enforce company email domain at signup (server-side)
-- Run once in Supabase Dashboard → SQL Editor (or as a migration).
-- This blocks direct Supabase Auth signUp calls that bypass the client-side allowlist.

begin;

-- Update this list to match NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS.
-- Domains must be lowercase, without leading @.
create or replace function public.enforce_allowed_signup_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  allowed_domains text[] := array['vinix7.id'];
  email_domain text;
begin
  if new.email is null then
    raise exception 'Email is required';
  end if;

  email_domain := lower(split_part(trim(new.email), '@', 2));

  if email_domain = '' or not (email_domain = any(allowed_domains)) then
    raise exception 'Email domain is not allowed'
      using errcode = '22023'; -- invalid_parameter_value
  end if;

  return new;
end;
$$;

-- Prevent anonymous/authenticated roles from calling it directly.
revoke all on function public.enforce_allowed_signup_email() from public;
revoke all on function public.enforce_allowed_signup_email() from anon;
revoke all on function public.enforce_allowed_signup_email() from authenticated;

drop trigger if exists enforce_allowed_signup_email on auth.users;
create trigger enforce_allowed_signup_email
  before insert on auth.users
  for each row
  execute function public.enforce_allowed_signup_email();

commit;

-- Notes:
-- 1. Keep NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS and allowed_domains in sync.
-- 2. Existing users are not affected. Only new signups are checked.
-- 3. If you later add/change domains, update the array and re-run this script.
-- 4. Keep the client-side check in src/lib/supabase/auth.ts for friendly UX errors;
--    this trigger is the security boundary.
