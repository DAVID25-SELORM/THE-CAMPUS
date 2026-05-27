-- UniConnect Phase 6: Career & AI Ecosystem
-- Run AFTER 007_elections_official_governance.sql.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  proficiency text default 'beginner',
  created_at timestamptz default now(),
  unique(user_id, skill_id)
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  title text not null,
  description text,
  project_url text,
  github_url text,
  created_at timestamptz default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete set null,
  name text not null,
  description text,
  website text,
  logo_url text,
  verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  title text not null,
  description text,
  location text,
  employment_type text default 'internship',
  deadline timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid references public.internships(id) on delete cascade,
  applicant_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending',
  cover_letter text,
  created_at timestamptz default now(),
  unique(internship_id, applicant_id)
);

create table if not exists public.ai_study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  topic text not null,
  prompt text,
  ai_response text,
  created_at timestamptz default now()
);

create table if not exists public.resume_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  headline text,
  summary text,
  experience text,
  education text,
  achievements text,
  linkedin_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.portfolios
add column if not exists university_id uuid references public.universities(id) on delete cascade;

alter table public.companies
add column if not exists verified boolean default false;

alter table public.internships
add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.ai_study_sessions
add column if not exists university_id uuid references public.universities(id) on delete cascade;

alter table public.resume_profiles
add column if not exists university_id uuid references public.universities(id) on delete cascade;

alter table public.resume_profiles
add column if not exists updated_at timestamptz default now();

alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.portfolios enable row level security;
alter table public.companies enable row level security;
alter table public.internships enable row level security;
alter table public.job_applications enable row level security;
alter table public.ai_study_sessions enable row level security;
alter table public.resume_profiles enable row level security;

drop policy if exists "skills read" on public.skills;
create policy "skills read"
on public.skills for select to authenticated using (true);

drop policy if exists "skills manage admins" on public.skills;
create policy "skills manage admins"
on public.skills for all to authenticated
using (public.current_user_role() in ('super_admin','university_admin'))
with check (public.current_user_role() in ('super_admin','university_admin'));

drop policy if exists "profile skills own" on public.profile_skills;
create policy "profile skills own"
on public.profile_skills for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "portfolio read" on public.portfolios;
create policy "portfolio read"
on public.portfolios for select to authenticated
using (
  user_id = auth.uid()
  or university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "portfolio manage own" on public.portfolios;
create policy "portfolio manage own"
on public.portfolios for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    university_id is null
    or university_id = public.current_user_university_id()
  )
);

drop policy if exists "companies read" on public.companies;
create policy "companies read"
on public.companies for select to authenticated
using (
  university_id is null
  or university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "companies manage admins" on public.companies;
create policy "companies manage admins"
on public.companies for all to authenticated
using (public.current_user_role() in ('super_admin','university_admin'))
with check (
  public.current_user_role() = 'super_admin'
  or university_id = public.current_user_university_id()
);

drop policy if exists "internships read" on public.internships;
create policy "internships read"
on public.internships for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "internships manage admins" on public.internships;
create policy "internships manage admins"
on public.internships for all to authenticated
using (public.current_user_role() in ('super_admin','university_admin'))
with check (
  public.current_user_role() = 'super_admin'
  or university_id = public.current_user_university_id()
);

drop policy if exists "applications own" on public.job_applications;
create policy "applications own"
on public.job_applications for all to authenticated
using (
  applicant_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
)
with check (
  applicant_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "ai sessions own" on public.ai_study_sessions;
create policy "ai sessions own"
on public.ai_study_sessions for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    university_id is null
    or university_id = public.current_user_university_id()
  )
);

drop policy if exists "resume own" on public.resume_profiles;
create policy "resume own"
on public.resume_profiles for all to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
)
with check (
  user_id = auth.uid()
  and (
    university_id is null
    or university_id = public.current_user_university_id()
  )
);

create index if not exists idx_portfolios_user on public.portfolios(user_id, created_at);
create index if not exists idx_internships_university on public.internships(university_id, created_at);
create index if not exists idx_job_applications_applicant on public.job_applications(applicant_id, created_at);
create index if not exists idx_ai_study_sessions_user on public.ai_study_sessions(user_id, created_at);
create index if not exists idx_resume_profiles_user on public.resume_profiles(user_id);

insert into public.skills (name)
values
  ('React'),
  ('Supabase'),
  ('Data Analysis'),
  ('Public Speaking'),
  ('Graphic Design'),
  ('Project Management')
on conflict (name) do nothing;
