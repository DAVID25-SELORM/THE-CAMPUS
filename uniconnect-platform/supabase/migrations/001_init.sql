-- UniConnect Supabase Schema + RLS
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  location text,
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id uuid references public.universities(id),
  department_id uuid references public.departments(id),
  full_name text not null default 'New Student',
  student_id text,
  level text,
  bio text,
  skills text[] default '{}',
  avatar_url text,
  role text not null default 'student',
  verification_status text not null default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  description text,
  type text default 'general',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  unique(community_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  media_url text,
  visibility text default 'university',
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  title text not null,
  description text,
  location text,
  event_date timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric default 0,
  image_url text,
  status text default 'available',
  created_at timestamptz default now()
);

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  title text not null,
  description text,
  status text default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid references public.elections(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  position text not null,
  manifesto text,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid references public.elections(id) on delete cascade,
  voter_id uuid references public.profiles(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete cascade,
  position text not null,
  created_at timestamptz default now(),
  unique(election_id, voter_id, position)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create or replace function public.current_user_university_id()
returns uuid
language sql
security definer
stable
as $$
  select university_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.notify_post_author()
returns trigger
language plpgsql
security definer
as $$
declare
  target_post public.posts%rowtype;
  actor_name text;
begin
  select * into target_post from public.posts where id = new.post_id;

  if target_post.author_id is null or target_post.author_id = new.author_id then
    return new;
  end if;

  select coalesce(full_name, 'A student') into actor_name
  from public.profiles
  where id = new.author_id;

  insert into public.notifications (
    university_id,
    recipient_id,
    actor_id,
    post_id,
    type,
    title,
    body
  )
  values (
    target_post.university_id,
    target_post.author_id,
    new.author_id,
    new.post_id,
    'comment',
    actor_name || ' commented on your post',
    left(new.content, 180)
  );

  return new;
end;
$$;

create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
as $$
declare
  target_post public.posts%rowtype;
  actor_name text;
begin
  select * into target_post from public.posts where id = new.post_id;

  if target_post.author_id is null or target_post.author_id = new.user_id then
    return new;
  end if;

  select coalesce(full_name, 'A student') into actor_name
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (
    university_id,
    recipient_id,
    actor_id,
    post_id,
    type,
    title,
    body
  )
  values (
    target_post.university_id,
    target_post.author_id,
    new.user_id,
    new.post_id,
    'like',
    actor_name || ' liked your post',
    left(target_post.content, 180)
  );

  return new;
end;
$$;

alter table public.universities enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.notifications enable row level security;
alter table public.events enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.elections enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;
alter table public.reports enable row level security;

drop policy if exists "read universities" on public.universities;
create policy "read universities" on public.universities for select to authenticated using (true);

drop policy if exists "read departments" on public.departments;
create policy "read departments" on public.departments for select to authenticated using (true);

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (
  id = auth.uid()
  or university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (
  id = auth.uid() or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "university communities read" on public.communities;
create policy "university communities read" on public.communities for select to authenticated using (
  university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin'
);

drop policy if exists "verified create communities" on public.communities;
create policy "verified create communities" on public.communities for insert to authenticated with check (
  university_id = public.current_user_university_id()
);

drop policy if exists "community members read" on public.community_members;
create policy "community members read" on public.community_members for select to authenticated using (
  exists (
    select 1
    from public.communities c
    where c.id = public.community_members.community_id
      and (c.university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin')
  )
);

drop policy if exists "join community" on public.community_members;
create policy "join community" on public.community_members for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.communities c
    where c.id = public.community_members.community_id
      and c.university_id = public.current_user_university_id()
  )
);

drop policy if exists "campus posts read" on public.posts;
create policy "campus posts read" on public.posts for select to authenticated using (
  university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin'
);

drop policy if exists "campus posts insert" on public.posts;
create policy "campus posts insert" on public.posts for insert to authenticated with check (
  author_id = auth.uid() and university_id = public.current_user_university_id()
);

drop policy if exists "own posts update" on public.posts;
create policy "own posts update" on public.posts for update to authenticated using (
  author_id = auth.uid() or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "own posts delete" on public.posts;
create policy "own posts delete" on public.posts for delete to authenticated using (
  author_id = auth.uid() or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select to authenticated using (
  exists (
    select 1
    from public.posts p
    where p.id = public.comments.post_id
      and (p.university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin')
  )
);

drop policy if exists "comments insert" on public.comments;
create policy "comments insert" on public.comments for insert to authenticated with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.posts p
    where p.id = public.comments.post_id
      and p.university_id = public.current_user_university_id()
  )
);

drop policy if exists "likes read" on public.likes;
create policy "likes read" on public.likes for select to authenticated using (
  exists (
    select 1
    from public.posts p
    where p.id = public.likes.post_id
      and (p.university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin')
  )
);

drop policy if exists "likes insert" on public.likes;
create policy "likes insert" on public.likes for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.posts p
    where p.id = public.likes.post_id
      and p.university_id = public.current_user_university_id()
  )
);

drop policy if exists "likes delete" on public.likes;
create policy "likes delete" on public.likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications for select to authenticated using (
  recipient_id = auth.uid()
);

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications for update to authenticated using (
  recipient_id = auth.uid()
) with check (
  recipient_id = auth.uid()
);

drop policy if exists "events read" on public.events;
create policy "events read" on public.events for select to authenticated using (
  university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin'
);

drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events for insert to authenticated with check (
  university_id = public.current_user_university_id() and created_by = auth.uid()
);

drop policy if exists "market read" on public.marketplace_items;
create policy "market read" on public.marketplace_items for select to authenticated using (
  university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin'
);

drop policy if exists "market insert" on public.marketplace_items;
create policy "market insert" on public.marketplace_items for insert to authenticated with check (
  university_id = public.current_user_university_id() and seller_id = auth.uid()
);

drop policy if exists "elections read" on public.elections;
create policy "elections read" on public.elections for select to authenticated using (
  university_id = public.current_user_university_id() or public.current_user_role() = 'super_admin'
);

drop policy if exists "candidates read" on public.candidates;
create policy "candidates read" on public.candidates for select to authenticated using (true);

drop policy if exists "votes insert self" on public.votes;
create policy "votes insert self" on public.votes for insert to authenticated with check (voter_id = auth.uid());

drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert to authenticated with check (
  reporter_id = auth.uid() and university_id = public.current_user_university_id()
);

drop trigger if exists create_comment_notification on public.comments;
create trigger create_comment_notification
after insert on public.comments
for each row execute function public.notify_post_author();

drop trigger if exists create_like_notification on public.likes;
create trigger create_like_notification
after insert on public.likes
for each row execute function public.notify_post_like();

insert into public.universities (name, short_name, location)
values ('Regent University College of Science and Technology', 'Regent', 'Accra, Ghana')
on conflict do nothing;
