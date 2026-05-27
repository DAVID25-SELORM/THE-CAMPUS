-- UniConnect Phase 5: Academic progression and multi-school enrollment
-- Run AFTER previous migrations.

alter table public.profiles
add column if not exists date_of_birth date;

alter table public.profiles
add column if not exists academic_start_year integer;

alter table public.profiles
add column if not exists starting_level integer default 100;

alter table public.profiles
add column if not exists program_duration_years integer default 4;

alter table public.profiles
add column if not exists academic_status text default 'student';

create table if not exists public.profile_universities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  student_id text,
  program_name text,
  academic_start_year integer,
  starting_level integer default 100,
  program_duration_years integer default 4,
  relationship_type text default 'student',
  is_primary boolean default false,
  created_at timestamptz default now(),
  unique(user_id, university_id, student_id)
);

create or replace function public.computed_student_level(
  start_year integer,
  first_level integer,
  duration_years integer
)
returns text
language plpgsql
stable
as $$
declare
  years_elapsed integer;
  next_level integer;
begin
  if start_year is null or first_level is null then
    return null;
  end if;

  years_elapsed := greatest(extract(year from now())::integer - start_year, 0);

  if duration_years is not null and years_elapsed >= duration_years then
    return 'Old Student';
  end if;

  next_level := first_level + (years_elapsed * 100);
  return next_level::text;
end;
$$;

create or replace function public.sync_profile_academic_progression()
returns trigger
language plpgsql
as $$
declare
  computed_level text;
begin
  if new.date_of_birth is not null and new.date_of_birth > current_date then
    raise exception 'Date of birth cannot be in the future';
  end if;

  if new.academic_start_year is not null and new.academic_start_year > extract(year from now())::integer then
    raise exception 'Academic start year cannot be in the future';
  end if;

  computed_level := public.computed_student_level(
    new.academic_start_year,
    new.starting_level,
    new.program_duration_years
  );

  if computed_level is not null then
    new.level := computed_level;
    new.academic_status := case when computed_level = 'Old Student' then 'old_student' else 'student' end;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_academic_progression_trigger on public.profiles;
create trigger sync_profile_academic_progression_trigger
before insert or update on public.profiles
for each row execute function public.sync_profile_academic_progression();

create or replace function public.sync_primary_profile_university()
returns trigger
language plpgsql
as $$
begin
  if new.is_primary then
    update public.profile_universities
    set is_primary = false
    where user_id = new.user_id
      and id <> new.id;

    update public.profiles
    set
      university_id = new.university_id,
      department_id = new.department_id,
      student_id = coalesce(new.student_id, student_id),
      academic_start_year = new.academic_start_year,
      starting_level = new.starting_level,
      program_duration_years = new.program_duration_years
    where id = new.user_id;
  end if;

  return new;
end;
$$;

alter table public.profile_universities enable row level security;

drop policy if exists "profile universities read own_or_campus" on public.profile_universities;
create policy "profile universities read own_or_campus"
on public.profile_universities
for select to authenticated
using (
  user_id = auth.uid()
  or university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "profile universities create own" on public.profile_universities;
create policy "profile universities create own"
on public.profile_universities
for insert to authenticated
with check (
  user_id = auth.uid()
  and university_id is not null
  and (
    academic_start_year is null
    or academic_start_year <= extract(year from now())::integer
  )
);

drop policy if exists "profile universities update own" on public.profile_universities;
create policy "profile universities update own"
on public.profile_universities
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    academic_start_year is null
    or academic_start_year <= extract(year from now())::integer
  )
);

drop trigger if exists sync_primary_profile_university_trigger on public.profile_universities;
create trigger sync_primary_profile_university_trigger
after insert or update on public.profile_universities
for each row execute function public.sync_primary_profile_university();

create index if not exists idx_profile_universities_user on public.profile_universities(user_id);
create index if not exists idx_profile_universities_university on public.profile_universities(university_id);
