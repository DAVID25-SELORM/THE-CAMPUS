-- UniConnect Phase 2: Realtime Communication
-- Run AFTER 001_init.sql.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  title text,
  type text not null default 'direct',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  last_read_at timestamptz,
  created_at timestamptz default now(),
  unique(conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text,
  media_url text,
  message_type text default 'text',
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.conversation_typing (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  is_typing boolean default false,
  updated_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  started_by uuid references public.profiles(id) on delete set null,
  call_type text not null default 'audio',
  status text not null default 'ringing',
  created_at timestamptz default now(),
  ended_at timestamptz
);

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references public.call_sessions(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  signal_type text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table public.notifications
add column if not exists link_url text;

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  online boolean default false,
  last_seen_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_typing enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_signals enable row level security;
alter table public.notifications enable row level security;
alter table public.user_presence enable row level security;

create or replace function public.is_conversation_member(conversation_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conversation_uuid
    and user_id = auth.uid()
  )
$$;

drop policy if exists "conversation read for members" on public.conversations;
create policy "conversation read for members" on public.conversations
for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversations.id
    and cm.user_id = auth.uid()
  )
);

drop policy if exists "conversation create in own university" on public.conversations;
create policy "conversation create in own university" on public.conversations
for insert to authenticated
with check (
  created_by = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "conversation update for members" on public.conversations;
create policy "conversation update for members" on public.conversations
for update to authenticated
using (
  public.is_conversation_member(id)
  or public.current_user_role() in ('super_admin','university_admin')
)
with check (
  public.is_conversation_member(id)
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "conversation members read for members" on public.conversation_members;
create policy "conversation members read for members" on public.conversation_members
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_conversation_member(conversation_id)
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "conversation members insert" on public.conversation_members;
create policy "conversation members insert" on public.conversation_members
for insert to authenticated
with check (
  user_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
  or exists (
    select 1 from public.conversations c
    where c.id = conversation_id
    and c.created_by = auth.uid()
  )
);

drop policy if exists "conversation members update self" on public.conversation_members;
create policy "conversation members update self" on public.conversation_members
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "messages read for members" on public.messages;
create policy "messages read for members" on public.messages
for select to authenticated
using (
  public.is_conversation_member(conversation_id)
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "messages insert for members" on public.messages;
create policy "messages insert for members" on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "messages update own" on public.messages;
create policy "messages update own" on public.messages
for update to authenticated
using (
  sender_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "typing read for members" on public.conversation_typing;
create policy "typing read for members" on public.conversation_typing
for select to authenticated
using (
  public.is_conversation_member(conversation_id)
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "typing upsert own" on public.conversation_typing;
create policy "typing upsert own" on public.conversation_typing
for insert to authenticated
with check (
  user_id = auth.uid()
  and university_id = public.current_user_university_id()
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "typing update own" on public.conversation_typing;
create policy "typing update own" on public.conversation_typing
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "calls read for members" on public.call_sessions;
create policy "calls read for members" on public.call_sessions
for select to authenticated
using (
  public.is_conversation_member(conversation_id)
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "calls create for members" on public.call_sessions;
create policy "calls create for members" on public.call_sessions
for insert to authenticated
with check (
  started_by = auth.uid()
  and university_id = public.current_user_university_id()
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "calls update for members" on public.call_sessions;
create policy "calls update for members" on public.call_sessions
for update to authenticated
using (
  public.is_conversation_member(conversation_id)
  or public.current_user_role() in ('super_admin','university_admin')
)
with check (
  public.is_conversation_member(conversation_id)
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "call signals read for members" on public.call_signals;
create policy "call signals read for members" on public.call_signals
for select to authenticated
using (
  exists (
    select 1
    from public.call_sessions cs
    where cs.id = call_id
      and public.is_conversation_member(cs.conversation_id)
  )
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "call signals create for members" on public.call_signals;
create policy "call signals create for members" on public.call_signals
for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.call_sessions cs
    where cs.id = call_id
      and public.is_conversation_member(cs.conversation_id)
  )
);

drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications
for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists "notifications insert admins" on public.notifications;
create policy "notifications insert admins" on public.notifications
for insert to authenticated
with check (
  recipient_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "presence read same university" on public.user_presence;
create policy "presence read same university" on public.user_presence
for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "presence insert own" on public.user_presence;
create policy "presence insert own" on public.user_presence
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "presence update own" on public.user_presence;
create policy "presence update own" on public.user_presence
for update to authenticated
using (user_id = auth.uid());

create index if not exists idx_conversation_members_user on public.conversation_members(user_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);
create index if not exists idx_conversation_typing_conversation on public.conversation_typing(conversation_id, updated_at);
create index if not exists idx_call_sessions_conversation_status on public.call_sessions(conversation_id, status, created_at);
create index if not exists idx_call_signals_call_created on public.call_signals(call_id, created_at);
create index if not exists idx_notifications_recipient_read on public.notifications(recipient_id, read_at);
