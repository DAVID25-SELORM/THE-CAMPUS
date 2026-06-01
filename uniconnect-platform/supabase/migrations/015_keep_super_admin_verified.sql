-- Super admin accounts are platform-trusted accounts and must not remain pending.

update public.profiles
set verification_status = 'verified'
where role = 'super_admin'
  and verification_status is distinct from 'verified';

create or replace function public.keep_super_admin_profiles_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'super_admin' then
    new.verification_status := 'verified';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_keep_super_admin_verified on public.profiles;
create trigger profiles_keep_super_admin_verified
before insert or update of role, verification_status
on public.profiles
for each row
execute function public.keep_super_admin_profiles_verified();
