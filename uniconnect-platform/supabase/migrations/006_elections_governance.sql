-- UniConnect Phase 5: Elections & Governance
-- Run AFTER previous migrations. Named 006 because 005 is academic progression.

alter table public.elections
add column if not exists election_type text default 'general';

alter table public.elections
add column if not exists visibility text default 'university';

alter table public.candidates
add column if not exists campaign_slogan text;

alter table public.candidates
add column if not exists approved boolean default true;

alter table public.votes
add column if not exists vote_hash text unique default encode(gen_random_bytes(12), 'hex');

create table if not exists public.election_positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid references public.elections(id) on delete cascade,
  title text not null,
  max_votes integer default 1,
  created_at timestamptz default now(),
  unique(election_id, title)
);

create table if not exists public.election_voters (
  id uuid primary key default gen_random_uuid(),
  election_id uuid references public.elections(id) on delete cascade,
  voter_id uuid references public.profiles(id) on delete cascade,
  has_voted boolean default false,
  verified boolean default true,
  created_at timestamptz default now(),
  unique(election_id, voter_id)
);

create table if not exists public.manifestos (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.debate_sessions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid references public.elections(id) on delete cascade,
  title text not null,
  description text,
  debate_date timestamptz,
  meeting_link text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.election_petitions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid references public.elections(id) on delete cascade,
  petitioner_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  details text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.election_positions enable row level security;
alter table public.election_voters enable row level security;
alter table public.manifestos enable row level security;
alter table public.debate_sessions enable row level security;
alter table public.election_petitions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "elections read" on public.elections;
create policy "elections read"
on public.elections for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "elections create admins" on public.elections;
create policy "elections create admins"
on public.elections for insert to authenticated
with check (
  created_by = auth.uid()
  and public.current_user_role() in ('super_admin','university_admin')
  and (
    public.current_user_role() = 'super_admin'
    or university_id = public.current_user_university_id()
  )
);

drop policy if exists "elections update admins" on public.elections;
create policy "elections update admins"
on public.elections for update to authenticated
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

drop policy if exists "election positions read same university" on public.election_positions;
create policy "election positions read same university"
on public.election_positions for select to authenticated
using (
  exists (
    select 1 from public.elections e
    where e.id = election_positions.election_id
      and (
        e.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "election positions manage admins" on public.election_positions;
create policy "election positions manage admins"
on public.election_positions for all to authenticated
using (
  public.current_user_role() in ('super_admin','university_admin')
)
with check (
  public.current_user_role() in ('super_admin','university_admin')
  and exists (
    select 1 from public.elections e
    where e.id = election_positions.election_id
      and (
        public.current_user_role() = 'super_admin'
        or e.university_id = public.current_user_university_id()
      )
  )
);

drop policy if exists "candidates read" on public.candidates;
create policy "candidates read"
on public.candidates for select to authenticated
using (
  exists (
    select 1 from public.elections e
    where e.id = candidates.election_id
      and (
        e.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "candidates create self" on public.candidates;
create policy "candidates create self"
on public.candidates for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.elections e
    where e.id = candidates.election_id
      and e.university_id = public.current_user_university_id()
  )
);

drop policy if exists "candidates update self_or_admin" on public.candidates;
create policy "candidates update self_or_admin"
on public.candidates for update to authenticated
using (
  profile_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
)
with check (
  profile_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "votes read same university" on public.votes;
create policy "votes read same university"
on public.votes for select to authenticated
using (
  exists (
    select 1 from public.elections e
    where e.id = votes.election_id
      and (
        e.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "votes insert self" on public.votes;
create policy "votes insert self"
on public.votes for insert to authenticated
with check (
  voter_id = auth.uid()
  and exists (
    select 1
    from public.elections e
    join public.candidates c on c.election_id = e.id
    where e.id = votes.election_id
      and c.id = votes.candidate_id
      and c.position = votes.position
      and e.university_id = public.current_user_university_id()
      and e.status = 'open'
  )
);

drop policy if exists "election voters read own_or_admin" on public.election_voters;
create policy "election voters read own_or_admin"
on public.election_voters for select to authenticated
using (
  voter_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "election voters manage admins" on public.election_voters;
create policy "election voters manage admins"
on public.election_voters for all to authenticated
using (public.current_user_role() in ('super_admin','university_admin'))
with check (public.current_user_role() in ('super_admin','university_admin'));

drop policy if exists "manifestos read same university" on public.manifestos;
create policy "manifestos read same university"
on public.manifestos for select to authenticated
using (
  exists (
    select 1
    from public.candidates c
    join public.elections e on e.id = c.election_id
    where c.id = manifestos.candidate_id
      and (
        e.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "manifestos write candidate_or_admin" on public.manifestos;
create policy "manifestos write candidate_or_admin"
on public.manifestos for all to authenticated
using (
  public.current_user_role() in ('super_admin','university_admin')
  or exists (
    select 1 from public.candidates c
    where c.id = manifestos.candidate_id
      and c.profile_id = auth.uid()
  )
)
with check (
  public.current_user_role() in ('super_admin','university_admin')
  or exists (
    select 1 from public.candidates c
    where c.id = manifestos.candidate_id
      and c.profile_id = auth.uid()
  )
);

drop policy if exists "debates read same university" on public.debate_sessions;
create policy "debates read same university"
on public.debate_sessions for select to authenticated
using (
  exists (
    select 1 from public.elections e
    where e.id = debate_sessions.election_id
      and (
        e.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "debates create admins" on public.debate_sessions;
create policy "debates create admins"
on public.debate_sessions for insert to authenticated
with check (
  created_by = auth.uid()
  and public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "petitions read same university" on public.election_petitions;
create policy "petitions read same university"
on public.election_petitions for select to authenticated
using (
  exists (
    select 1 from public.elections e
    where e.id = election_petitions.election_id
      and (
        e.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "petitions create own" on public.election_petitions;
create policy "petitions create own"
on public.election_petitions for insert to authenticated
with check (
  petitioner_id = auth.uid()
  and exists (
    select 1 from public.elections e
    where e.id = election_petitions.election_id
      and e.university_id = public.current_user_university_id()
  )
);

drop policy if exists "petitions update admins" on public.election_petitions;
create policy "petitions update admins"
on public.election_petitions for update to authenticated
using (public.current_user_role() in ('super_admin','university_admin'))
with check (public.current_user_role() in ('super_admin','university_admin'));

drop policy if exists "audit logs read admins" on public.audit_logs;
create policy "audit logs read admins"
on public.audit_logs for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "audit logs insert admins" on public.audit_logs;
create policy "audit logs insert admins"
on public.audit_logs for insert to authenticated
with check (
  actor_id = auth.uid()
  and (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'university_admin'
      and university_id = public.current_user_university_id()
    )
  )
);

create index if not exists idx_election_positions_election on public.election_positions(election_id);
create index if not exists idx_election_voters_election on public.election_voters(election_id);
create index if not exists idx_candidates_election_position on public.candidates(election_id, position);
create index if not exists idx_votes_election_candidate on public.votes(election_id, candidate_id);
create index if not exists idx_manifestos_candidate on public.manifestos(candidate_id);
create index if not exists idx_election_petitions_election on public.election_petitions(election_id);
create index if not exists idx_audit_logs_university on public.audit_logs(university_id, created_at);
