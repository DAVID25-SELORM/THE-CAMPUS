
-- UniConnect Phase 4: Events & Campus Engagement
-- Run AFTER previous migrations.

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz default now()
);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text default 'going', -- going | interested | cancelled
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete cascade,
  ticket_code text unique not null default encode(gen_random_bytes(8), 'hex'),
  ticket_type text default 'regular',
  amount numeric default 0,
  payment_status text default 'free', -- free | unpaid | paid | failed
  checked_in boolean default false,
  checked_in_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.event_checkins (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  ticket_id uuid references public.event_tickets(id) on delete set null,
  checked_in_by uuid references public.profiles(id) on delete set null,
  checkin_method text default 'qr', -- qr | manual
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

create table if not exists public.event_announcements (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table public.events
add column if not exists event_type text default 'General';

alter table public.events
add column if not exists category_id uuid references public.event_categories(id) on delete set null;

alter table public.event_categories enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_tickets enable row level security;
alter table public.event_checkins enable row level security;
alter table public.event_announcements enable row level security;
alter table public.event_feedback enable row level security;

drop policy if exists "event categories read same university" on public.event_categories;
create policy "event categories read same university"
on public.event_categories for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "event categories manage admins" on public.event_categories;
create policy "event categories manage admins"
on public.event_categories for all to authenticated
using (
  public.current_user_role() in ('super_admin','university_admin')
  and (
    public.current_user_role() = 'super_admin'
    or university_id = public.current_user_university_id()
  )
)
with check (
  public.current_user_role() in ('super_admin','university_admin')
  and (
    public.current_user_role() = 'super_admin'
    or university_id = public.current_user_university_id()
  )
);

drop policy if exists "event rsvps read same university" on public.event_rsvps;
create policy "event rsvps read same university"
on public.event_rsvps for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "event rsvps upsert own" on public.event_rsvps;
create policy "event rsvps upsert own"
on public.event_rsvps for insert to authenticated
with check (user_id = auth.uid() and university_id = public.current_user_university_id());

drop policy if exists "event rsvps update own" on public.event_rsvps;
create policy "event rsvps update own"
on public.event_rsvps for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "event tickets read own" on public.event_tickets;
create policy "event tickets read own"
on public.event_tickets for select to authenticated
using (
  buyer_id = auth.uid()
  or public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "event tickets create own" on public.event_tickets;
create policy "event tickets create own"
on public.event_tickets for insert to authenticated
with check (buyer_id = auth.uid() and university_id = public.current_user_university_id());

drop policy if exists "event tickets update admins" on public.event_tickets;
create policy "event tickets update admins"
on public.event_tickets for update to authenticated
using (
  buyer_id = auth.uid()
  or public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
)
with check (
  buyer_id = auth.uid()
  or public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "event checkins read same university" on public.event_checkins;
create policy "event checkins read same university"
on public.event_checkins for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "event checkins create" on public.event_checkins;
create policy "event checkins create"
on public.event_checkins for insert to authenticated
with check (
  university_id = public.current_user_university_id()
  and (
    user_id = auth.uid()
    or public.current_user_role() in ('super_admin','university_admin')
  )
);

drop policy if exists "event announcements read same university" on public.event_announcements;
create policy "event announcements read same university"
on public.event_announcements for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "event announcements create organizers" on public.event_announcements;
create policy "event announcements create organizers"
on public.event_announcements for insert to authenticated
with check (
  author_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "event feedback read same university" on public.event_feedback;
create policy "event feedback read same university"
on public.event_feedback for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "event feedback create own" on public.event_feedback;
create policy "event feedback create own"
on public.event_feedback for insert to authenticated
with check (user_id = auth.uid() and university_id = public.current_user_university_id());

drop policy if exists "event feedback update own" on public.event_feedback;
create policy "event feedback update own"
on public.event_feedback for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and university_id = public.current_user_university_id()
);

create index if not exists idx_event_rsvps_event on public.event_rsvps(event_id);
create index if not exists idx_event_tickets_event on public.event_tickets(event_id);
create index if not exists idx_event_checkins_event on public.event_checkins(event_id);
create index if not exists idx_event_announcements_event on public.event_announcements(event_id, created_at);
create index if not exists idx_event_feedback_event on public.event_feedback(event_id);
create unique index if not exists idx_event_tickets_event_buyer_unique on public.event_tickets(event_id, buyer_id);

insert into public.event_categories (university_id, name, color)
select u.id, seed.name, seed.color
from public.universities u
cross join (
  values
    ('Fellowship', '#00f5ff'),
    ('Conference', '#8b5cf6'),
    ('Seminar', '#22c55e'),
    ('Debate', '#f59e0b'),
    ('Career', '#ec4899')
) as seed(name, color)
where not exists (
  select 1
  from public.event_categories c
  where c.university_id = u.id
    and c.name = seed.name
);
