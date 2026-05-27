-- Regent University academic structure seed
-- Run AFTER previous migrations.

create table if not exists public.faculties (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz default now(),
  unique(university_id, name)
);

create table if not exists public.academic_levels (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  level text not null,
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(university_id, level)
);

create table if not exists public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(university_id, name)
);

alter table public.departments
add column if not exists faculty_id uuid references public.faculties(id) on delete set null;

alter table public.faculties enable row level security;
alter table public.academic_levels enable row level security;
alter table public.academic_sessions enable row level security;

drop policy if exists "faculties read" on public.faculties;
create policy "faculties read"
on public.faculties for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "faculties manage admins" on public.faculties;
create policy "faculties manage admins"
on public.faculties for all to authenticated
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

drop policy if exists "academic levels read" on public.academic_levels;
create policy "academic levels read"
on public.academic_levels for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "academic levels manage admins" on public.academic_levels;
create policy "academic levels manage admins"
on public.academic_levels for all to authenticated
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

drop policy if exists "academic sessions read" on public.academic_sessions;
create policy "academic sessions read"
on public.academic_sessions for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "academic sessions manage admins" on public.academic_sessions;
create policy "academic sessions manage admins"
on public.academic_sessions for all to authenticated
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

insert into public.universities (name, short_name, location)
select 'Regent University College of Science and Technology', 'Regent', 'Accra, Ghana'
where not exists (
  select 1
  from public.universities
  where name = 'Regent University College of Science and Technology'
);

update public.universities
set short_name = 'Regent'
where name = 'Regent University College of Science and Technology';

insert into public.faculties (university_id, name, code)
select u.id, 'Faculty of Engineering, Computing and Allied Sciences', 'FECAS'
from public.universities u
where u.name = 'Regent University College of Science and Technology'
  and not exists (
    select 1
    from public.faculties f
    where f.university_id = u.id
      and f.name = 'Faculty of Engineering, Computing and Allied Sciences'
  );

insert into public.departments (university_id, faculty_id, name)
select u.id, f.id, 'Computing'
from public.universities u
join public.faculties f on f.university_id = u.id
where u.name = 'Regent University College of Science and Technology'
  and f.code = 'FECAS'
  and not exists (
    select 1
    from public.departments d
    where d.university_id = u.id
      and d.name = 'Computing'
  );

update public.departments d
set faculty_id = f.id
from public.universities u
join public.faculties f on f.university_id = u.id
where d.university_id = u.id
  and d.name = 'Computing'
  and u.name = 'Regent University College of Science and Technology'
  and f.code = 'FECAS';

insert into public.academic_levels (university_id, level, sort_order)
select u.id, seed.level, seed.sort_order
from public.universities u
cross join (
  values
    ('100', 100),
    ('200', 200),
    ('300', 300),
    ('400', 400)
) as seed(level, sort_order)
where u.name = 'Regent University College of Science and Technology'
  and not exists (
    select 1
    from public.academic_levels l
    where l.university_id = u.id
      and l.level = seed.level
  );

insert into public.academic_sessions (university_id, name)
select u.id, seed.name
from public.universities u
cross join (
  values
    ('Regular'),
    ('Weekend')
) as seed(name)
where u.name = 'Regent University College of Science and Technology'
  and not exists (
    select 1
    from public.academic_sessions s
    where s.university_id = u.id
      and s.name = seed.name
  );

create index if not exists idx_faculties_university on public.faculties(university_id);
create index if not exists idx_departments_faculty on public.departments(faculty_id);
create index if not exists idx_academic_levels_university on public.academic_levels(university_id);
create index if not exists idx_academic_sessions_university on public.academic_sessions(university_id);
