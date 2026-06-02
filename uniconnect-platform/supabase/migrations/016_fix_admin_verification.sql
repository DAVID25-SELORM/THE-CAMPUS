-- Extend auto-verification to university_admin as well as super_admin.
-- Also back-fills any existing university_admin rows that are still pending.
--
-- NOTE FOR AdminBootstrap PAGE:
-- This migration installs a trigger that auto-sets verification_status = 'verified'
-- whenever a row with role 'university_admin' or 'super_admin' is written. However,
-- the trigger only fires if the UPDATE reaches the database in the first place.
-- If the profiles table has RLS enabled, the anon/authenticated key used by the
-- client may be blocked from updating the `role` column entirely — in which case
-- the AdminBootstrap page will silently fail or return a permissions error.
--
-- If that happens, the admin must run the following SQL directly in the
-- Supabase SQL Editor (Dashboard → SQL Editor) where RLS is bypassed:
--
--   update public.profiles
--   set role = 'university_admin'
--   where id = '<your-user-uuid>';
--
-- Alternatively, add an RLS policy that allows a user to set their own role
-- to 'university_admin' only when no university_admin yet exists (bootstrap guard).

-- 1. Back-fill existing records
update public.profiles
set verification_status = 'verified'
where role in ('super_admin', 'university_admin')
  and verification_status is distinct from 'verified';

-- 2. Replace the trigger function to cover both admin roles
create or replace function public.keep_admin_profiles_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role in ('super_admin', 'university_admin') then
    new.verification_status := 'verified';
  end if;
  return new;
end;
$$;

-- 3. Drop the old trigger (only covered super_admin) and replace it
drop trigger if exists profiles_keep_super_admin_verified on public.profiles;
drop trigger if exists profiles_keep_admin_verified on public.profiles;

create trigger profiles_keep_admin_verified
before insert or update of role, verification_status
on public.profiles
for each row
execute function public.keep_admin_profiles_verified();
