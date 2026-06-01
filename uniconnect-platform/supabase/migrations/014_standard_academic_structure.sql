-- UniConnect Phase 14: Standard academic structure and school overrides
-- Run AFTER the Ghana tertiary dataset migrations.

alter table public.faculties add column if not exists source_status text not null default 'system_default';
alter table public.departments add column if not exists source_status text not null default 'system_default';
alter table public.academic_levels add column if not exists source_status text not null default 'system_default';
alter table public.academic_sessions add column if not exists source_status text not null default 'system_default';
alter table public.courses add column if not exists source_status text not null default 'system_default';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'faculties_source_status_check') then
    alter table public.faculties add constraint faculties_source_status_check
      check (source_status in ('system_default','school_verified','admin_modified')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'departments_source_status_check') then
    alter table public.departments add constraint departments_source_status_check
      check (source_status in ('system_default','school_verified','admin_modified')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'academic_levels_source_status_check') then
    alter table public.academic_levels add constraint academic_levels_source_status_check
      check (source_status in ('system_default','school_verified','admin_modified')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'academic_sessions_source_status_check') then
    alter table public.academic_sessions add constraint academic_sessions_source_status_check
      check (source_status in ('system_default','school_verified','admin_modified')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'courses_source_status_check') then
    alter table public.courses add constraint courses_source_status_check
      check (source_status in ('system_default','school_verified','admin_modified')) not valid;
  end if;
end $$;

create table if not exists public.academic_programmes (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  university_id uuid references public.universities(id) on delete cascade,
  faculty_id uuid references public.faculties(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  award text,
  duration_years integer default 4,
  source_status text not null default 'system_default'
    check (source_status in ('system_default','school_verified','admin_modified')),
  created_at timestamptz default now(),
  unique(university_id, name)
);

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  source_id text unique,
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  location text,
  source_status text not null default 'system_default'
    check (source_status in ('system_default','school_verified','admin_modified')),
  created_at timestamptz default now(),
  unique(university_id, name)
);

alter table public.courses add column if not exists programme_id uuid references public.academic_programmes(id) on delete set null;
alter table public.courses add column if not exists academic_year text;
alter table public.courses add column if not exists sessions text[] default '{}';

alter table public.profiles add column if not exists faculty_id uuid references public.faculties(id) on delete set null;
alter table public.profiles add column if not exists faculty_code text;
alter table public.profiles add column if not exists programme_id uuid references public.academic_programmes(id) on delete set null;
alter table public.profiles add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.profiles add column if not exists course_code text;
alter table public.profiles add column if not exists session text;
alter table public.profiles add column if not exists academic_year text;
alter table public.profiles add column if not exists semester text;

alter table public.profile_universities add column if not exists faculty_id uuid references public.faculties(id) on delete set null;
alter table public.profile_universities add column if not exists faculty_code text;
alter table public.profile_universities add column if not exists programme_id uuid references public.academic_programmes(id) on delete set null;
alter table public.profile_universities add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.profile_universities add column if not exists course_code text;
alter table public.profile_universities add column if not exists level text;
alter table public.profile_universities add column if not exists session text;
alter table public.profile_universities add column if not exists academic_year text;
alter table public.profile_universities add column if not exists semester text;

alter table public.academic_programmes enable row level security;
alter table public.campuses enable row level security;

drop policy if exists "faculties read" on public.faculties;
create policy "faculties read"
on public.faculties for select to authenticated
using (true);

drop policy if exists "academic levels read" on public.academic_levels;
create policy "academic levels read"
on public.academic_levels for select to authenticated
using (true);

drop policy if exists "academic sessions read" on public.academic_sessions;
create policy "academic sessions read"
on public.academic_sessions for select to authenticated
using (true);

drop policy if exists "courses read same university" on public.courses;
drop policy if exists "courses read" on public.courses;
create policy "courses read"
on public.courses for select to authenticated
using (true);

drop policy if exists "departments manage admins" on public.departments;
create policy "departments manage admins"
on public.departments for all to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
)
with check (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "academic programmes read" on public.academic_programmes;
create policy "academic programmes read"
on public.academic_programmes for select to authenticated
using (true);

drop policy if exists "academic programmes manage admins" on public.academic_programmes;
create policy "academic programmes manage admins"
on public.academic_programmes for all to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
)
with check (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "campuses read" on public.campuses;
create policy "campuses read"
on public.campuses for select to authenticated
using (true);

drop policy if exists "campuses manage admins" on public.campuses;
create policy "campuses manage admins"
on public.campuses for all to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
)
with check (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

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
      faculty_id = new.faculty_id,
      faculty_code = new.faculty_code,
      department_id = new.department_id,
      programme_id = new.programme_id,
      course_id = new.course_id,
      course_code = new.course_code,
      student_id = coalesce(new.student_id, student_id),
      level = coalesce(new.level, level),
      session = new.session,
      academic_year = new.academic_year,
      semester = new.semester,
      academic_start_year = new.academic_start_year,
      starting_level = new.starting_level,
      program_duration_years = new.program_duration_years
    where id = new.user_id;
  end if;

  return new;
end;
$$;

update public.faculties f
set
  name = 'Faculty of Engineering, Computing and Allied Sciences',
  code = 'FECAS',
  source_status = 'school_verified'
from public.universities u
where f.university_id = u.id
  and (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
  and (
    f.source_id = 'regent_fecas'
    or f.name = 'Faculty of Engineering, Computing and Allied Sciences'
    or f.code = 'FECAS'
    or (
      (f.source_id = 'regent_computing_and_information_technology' or f.name = 'Computing and Information Technology')
      and not exists (
        select 1
        from public.faculties existing
        where existing.university_id = u.id
          and existing.id <> f.id
          and (
            existing.source_id = 'regent_fecas'
            or existing.name = 'Faculty of Engineering, Computing and Allied Sciences'
            or existing.code = 'FECAS'
          )
      )
    )
  );

insert into public.faculties (source_id, university_id, name, code, source_status)
select 'regent_fecas', u.id, 'Faculty of Engineering, Computing and Allied Sciences', 'FECAS', 'school_verified'
from public.universities u
where (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
  and not exists (
    select 1 from public.faculties f
    where f.university_id = u.id
      and (
        f.source_id in ('regent_fecas', 'regent_computing_and_information_technology')
        or f.code = 'FECAS'
        or f.name in ('Faculty of Engineering, Computing and Allied Sciences', 'Computing and Information Technology')
      )
  );

insert into public.departments (source_id, university_id, faculty_id, name, source_status)
select 'regent_fecas_computing', u.id, f.id, 'Computing', 'school_verified'
from public.universities u
join public.faculties f on f.university_id = u.id and f.code = 'FECAS'
where (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
  and not exists (
    select 1 from public.departments d
    where d.university_id = u.id and d.name = 'Computing'
  );

update public.departments d
set faculty_id = f.id, source_status = 'school_verified'
from public.universities u
join public.faculties f on f.university_id = u.id and f.code = 'FECAS'
where d.university_id = u.id
  and (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
  and d.name in ('Computing', 'Computer Science', 'Information Technology', 'Information Systems', 'Cybersecurity', 'Data Science', 'Software Engineering');

insert into public.academic_programmes (source_id, university_id, faculty_id, department_id, name, award, duration_years, source_status)
select 'regent_fecas_computing_bsc_computer_science', u.id, f.id, d.id, 'BSc Computer Science', 'BSc', 4, 'school_verified'
from public.universities u
join public.faculties f on f.university_id = u.id and f.code = 'FECAS'
join public.departments d on d.university_id = u.id and d.name = 'Computing'
where (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
  and not exists (
    select 1 from public.academic_programmes p
    where p.university_id = u.id and p.name = 'BSc Computer Science'
  );

insert into public.courses (source_id, university_id, faculty_id, department_id, programme_id, code, name, level, semester, course_type, sessions, source_status)
select 'regent_sics_2643', u.id, f.id, d.id, p.id, 'SICS 2643', 'Computer Architecture and Microprocessor', '200', 'Semester 2', 'core', array['Regular','Weekend'], 'school_verified'
from public.universities u
join public.faculties f on f.university_id = u.id and f.code = 'FECAS'
join public.departments d on d.university_id = u.id and d.name = 'Computing'
join public.academic_programmes p on p.university_id = u.id and p.name = 'BSc Computer Science'
where (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
on conflict (source_id) do update
set
  code = excluded.code,
  name = excluded.name,
  level = excluded.level,
  semester = excluded.semester,
  faculty_id = excluded.faculty_id,
  department_id = excluded.department_id,
  programme_id = excluded.programme_id,
  sessions = excluded.sessions,
  source_status = 'school_verified';

insert into public.academic_sessions (university_id, name, source_status)
select u.id, seed.name, 'school_verified'
from public.universities u
cross join (values ('Regular'), ('Weekend')) as seed(name)
where (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
on conflict (university_id, name) do update
set source_status = 'school_verified';

insert into public.campuses (source_id, university_id, name, location, source_status)
select 'regent_main_campus', u.id, 'Main Campus', 'Accra, Ghana', 'school_verified'
from public.universities u
where (u.source_id = 'regent' or u.name = 'Regent University College of Science and Technology')
on conflict (university_id, name) do update
set location = excluded.location, source_status = 'school_verified';

create index if not exists idx_academic_programmes_university on public.academic_programmes(university_id);
create index if not exists idx_academic_programmes_department on public.academic_programmes(department_id);
create index if not exists idx_campuses_university on public.campuses(university_id);
create index if not exists idx_courses_programme on public.courses(programme_id);
create index if not exists idx_profiles_academic on public.profiles(university_id, faculty_id, department_id, programme_id, course_id);
