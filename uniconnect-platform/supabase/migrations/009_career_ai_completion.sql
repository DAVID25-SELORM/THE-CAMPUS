-- UniConnect Phase 6 completion: recruiters, endorsements, reputation, richer AI
-- Run AFTER 008_career_ai_ecosystem.sql.

create table if not exists public.recruiter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  title text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.skill_endorsements (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references public.skills(id) on delete cascade,
  endorsed_user_id uuid references public.profiles(id) on delete cascade,
  endorser_id uuid references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  unique(skill_id, endorsed_user_id, endorser_id)
);

create table if not exists public.career_reputation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  portfolio_score integer default 0,
  skills_score integer default 0,
  endorsements_score integer default 0,
  applications_score integer default 0,
  total_score integer default 0,
  updated_at timestamptz default now()
);

alter table public.ai_study_sessions
add column if not exists session_type text default 'study_plan';

alter table public.ai_study_sessions
add column if not exists source_text text;

alter table public.resume_profiles
add column if not exists optimized_summary text;

alter table public.resume_profiles
add column if not exists public_profile_slug text unique;

alter table public.recruiter_profiles enable row level security;
alter table public.skill_endorsements enable row level security;
alter table public.career_reputation enable row level security;

drop policy if exists "companies create authenticated" on public.companies;
create policy "companies create authenticated"
on public.companies for insert to authenticated
with check (
  university_id is null
  or university_id = public.current_user_university_id()
);

drop policy if exists "companies update recruiters" on public.companies;
create policy "companies update recruiters"
on public.companies for update to authenticated
using (
  exists (
    select 1 from public.recruiter_profiles rp
    where rp.company_id = companies.id
      and rp.user_id = auth.uid()
      and rp.status = 'approved'
  )
)
with check (
  exists (
    select 1 from public.recruiter_profiles rp
    where rp.company_id = companies.id
      and rp.user_id = auth.uid()
      and rp.status = 'approved'
  )
);

drop policy if exists "recruiters read campus" on public.recruiter_profiles;
create policy "recruiters read campus"
on public.recruiter_profiles for select to authenticated
using (
  user_id = auth.uid()
  or university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "recruiters create own" on public.recruiter_profiles;
create policy "recruiters create own"
on public.recruiter_profiles for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    university_id is null
    or university_id = public.current_user_university_id()
  )
);

drop policy if exists "recruiters update admins" on public.recruiter_profiles;
create policy "recruiters update admins"
on public.recruiter_profiles for update to authenticated
using (
  public.current_user_role() in ('super_admin','university_admin')
)
with check (
  public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "internships manage recruiters" on public.internships;
create policy "internships manage recruiters"
on public.internships for all to authenticated
using (
  exists (
    select 1 from public.recruiter_profiles rp
    where rp.user_id = auth.uid()
      and rp.company_id = internships.company_id
      and rp.status = 'approved'
  )
)
with check (
  exists (
    select 1 from public.recruiter_profiles rp
    where rp.user_id = auth.uid()
      and rp.company_id = internships.company_id
      and rp.status = 'approved'
  )
  and university_id = public.current_user_university_id()
);

drop policy if exists "applications own" on public.job_applications;
drop policy if exists "applications applicant select" on public.job_applications;
create policy "applications applicant select"
on public.job_applications for select to authenticated
using (applicant_id = auth.uid());

drop policy if exists "applications applicant insert" on public.job_applications;
create policy "applications applicant insert"
on public.job_applications for insert to authenticated
with check (applicant_id = auth.uid());

drop policy if exists "applications recruiters read" on public.job_applications;
create policy "applications recruiters read"
on public.job_applications for select to authenticated
using (
  applicant_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
  or exists (
    select 1
    from public.internships i
    join public.recruiter_profiles rp on rp.company_id = i.company_id
    where i.id = job_applications.internship_id
      and rp.user_id = auth.uid()
      and rp.status = 'approved'
  )
);

drop policy if exists "applications recruiters update" on public.job_applications;
create policy "applications recruiters update"
on public.job_applications for update to authenticated
using (
  public.current_user_role() in ('super_admin','university_admin')
  or exists (
    select 1
    from public.internships i
    join public.recruiter_profiles rp on rp.company_id = i.company_id
    where i.id = job_applications.internship_id
      and rp.user_id = auth.uid()
      and rp.status = 'approved'
  )
)
with check (
  public.current_user_role() in ('super_admin','university_admin')
  or exists (
    select 1
    from public.internships i
    join public.recruiter_profiles rp on rp.company_id = i.company_id
    where i.id = job_applications.internship_id
      and rp.user_id = auth.uid()
      and rp.status = 'approved'
  )
);

drop policy if exists "endorsements read campus" on public.skill_endorsements;
create policy "endorsements read campus"
on public.skill_endorsements for select to authenticated
using (
  endorsed_user_id = auth.uid()
  or endorser_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = skill_endorsements.endorsed_user_id
      and p.university_id = public.current_user_university_id()
  )
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "endorsements create self" on public.skill_endorsements;
create policy "endorsements create self"
on public.skill_endorsements for insert to authenticated
with check (
  endorser_id = auth.uid()
);

drop policy if exists "reputation read campus" on public.career_reputation;
create policy "reputation read campus"
on public.career_reputation for select to authenticated
using (
  user_id = auth.uid()
  or university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "reputation upsert own_or_admin" on public.career_reputation;
create policy "reputation upsert own_or_admin"
on public.career_reputation for all to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
)
with check (
  user_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

create index if not exists idx_recruiter_profiles_user on public.recruiter_profiles(user_id);
create index if not exists idx_recruiter_profiles_company on public.recruiter_profiles(company_id);
create index if not exists idx_skill_endorsements_user on public.skill_endorsements(endorsed_user_id, created_at);
create index if not exists idx_career_reputation_university on public.career_reputation(university_id, total_score);
