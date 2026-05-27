-- UniConnect Phase 5 completion: official governance tools
-- Run AFTER 006_elections_governance.sql.

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  election_id uuid references public.elections(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  question text not null,
  status text default 'open',
  closes_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade,
  label text not null,
  created_at timestamptz default now()
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade,
  option_id uuid references public.poll_options(id) on delete cascade,
  voter_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(poll_id, voter_id)
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists "votes insert self" on public.votes;
create policy "votes insert self"
on public.votes for insert to authenticated
with check (
  voter_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.verification_status = 'verified'
  )
  and (
    not exists (
      select 1 from public.election_voters ev
      where ev.election_id = votes.election_id
    )
    or exists (
      select 1 from public.election_voters ev
      where ev.election_id = votes.election_id
        and ev.voter_id = auth.uid()
        and ev.verified = true
    )
  )
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

drop policy if exists "polls read same university" on public.polls;
create policy "polls read same university"
on public.polls for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "polls create admins" on public.polls;
create policy "polls create admins"
on public.polls for insert to authenticated
with check (
  created_by = auth.uid()
  and public.current_user_role() in ('super_admin','university_admin')
  and (
    public.current_user_role() = 'super_admin'
    or university_id = public.current_user_university_id()
  )
);

drop policy if exists "polls update admins" on public.polls;
create policy "polls update admins"
on public.polls for update to authenticated
using (public.current_user_role() in ('super_admin','university_admin'))
with check (public.current_user_role() in ('super_admin','university_admin'));

drop policy if exists "poll options read same university" on public.poll_options;
create policy "poll options read same university"
on public.poll_options for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = poll_options.poll_id
      and (
        p.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "poll options create admins" on public.poll_options;
create policy "poll options create admins"
on public.poll_options for insert to authenticated
with check (
  public.current_user_role() in ('super_admin','university_admin')
  and exists (
    select 1 from public.polls p
    where p.id = poll_options.poll_id
      and (
        public.current_user_role() = 'super_admin'
        or p.university_id = public.current_user_university_id()
      )
  )
);

drop policy if exists "poll votes read same university" on public.poll_votes;
create policy "poll votes read same university"
on public.poll_votes for select to authenticated
using (
  exists (
    select 1 from public.polls p
    where p.id = poll_votes.poll_id
      and (
        p.university_id = public.current_user_university_id()
        or public.current_user_role() = 'super_admin'
      )
  )
);

drop policy if exists "poll votes insert self" on public.poll_votes;
create policy "poll votes insert self"
on public.poll_votes for insert to authenticated
with check (
  voter_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.verification_status = 'verified'
  )
  and exists (
    select 1 from public.polls p
    join public.poll_options po on po.poll_id = p.id
    where p.id = poll_votes.poll_id
      and po.id = poll_votes.option_id
      and p.status = 'open'
      and p.university_id = public.current_user_university_id()
  )
);

drop function if exists public.log_election_candidate() cascade;
create function public.log_election_candidate()
returns trigger
language plpgsql
security definer
as $$
declare
  election_row public.elections%rowtype;
begin
  select * into election_row from public.elections where id = new.election_id;

  insert into public.audit_logs (university_id, actor_id, action, target_type, target_id, metadata)
  values (
    election_row.university_id,
    new.profile_id,
    'candidate_registered',
    'candidate',
    new.id,
    jsonb_build_object('election_id', new.election_id, 'position', new.position)
  );

  return new;
end;
$$;

drop function if exists public.log_election_vote() cascade;
create function public.log_election_vote()
returns trigger
language plpgsql
security definer
as $$
declare
  election_row public.elections%rowtype;
begin
  select * into election_row from public.elections where id = new.election_id;

  update public.election_voters
  set has_voted = true
  where election_id = new.election_id
    and voter_id = new.voter_id;

  insert into public.audit_logs (university_id, actor_id, action, target_type, target_id, metadata)
  values (
    election_row.university_id,
    new.voter_id,
    'vote_cast',
    'vote',
    new.id,
    jsonb_build_object('election_id', new.election_id, 'position', new.position)
  );

  return new;
end;
$$;

drop function if exists public.log_election_petition() cascade;
create function public.log_election_petition()
returns trigger
language plpgsql
security definer
as $$
declare
  election_row public.elections%rowtype;
begin
  select * into election_row from public.elections where id = new.election_id;

  insert into public.audit_logs (university_id, actor_id, action, target_type, target_id, metadata)
  values (
    election_row.university_id,
    new.petitioner_id,
    'petition_submitted',
    'election_petition',
    new.id,
    jsonb_build_object('election_id', new.election_id, 'status', new.status)
  );

  return new;
end;
$$;

drop trigger if exists log_election_candidate_trigger on public.candidates;
create trigger log_election_candidate_trigger
after insert on public.candidates
for each row execute function public.log_election_candidate();

drop trigger if exists log_election_vote_trigger on public.votes;
create trigger log_election_vote_trigger
after insert on public.votes
for each row execute function public.log_election_vote();

drop trigger if exists log_election_petition_trigger on public.election_petitions;
create trigger log_election_petition_trigger
after insert on public.election_petitions
for each row execute function public.log_election_petition();

create index if not exists idx_polls_election on public.polls(election_id, created_at);
create index if not exists idx_poll_options_poll on public.poll_options(poll_id);
create index if not exists idx_poll_votes_poll on public.poll_votes(poll_id);
