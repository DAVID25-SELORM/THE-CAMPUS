-- UniConnect Phase 7: Enterprise & National Expansion
-- Run AFTER 009_career_ai_completion.sql.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric default 0,
  billing_cycle text default 'monthly',
  max_students integer,
  features jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.university_subscriptions (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text default 'trial',
  starts_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.white_label_settings (
  id uuid primary key default gen_random_uuid(),
  university_id uuid unique references public.universities(id) on delete cascade,
  primary_color text default '#00f5ff',
  secondary_color text default '#8b5cf6',
  logo_url text,
  portal_name text,
  custom_domain text,
  created_at timestamptz default now()
);

create table if not exists public.campus_ambassadors (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'ambassador',
  referral_code text unique,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  referrer_id uuid references public.profiles(id) on delete set null,
  referred_user_id uuid references public.profiles(id) on delete cascade,
  reward_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete set null,
  sponsor_name text not null,
  title text not null,
  body text,
  image_url text,
  target_type text default 'university',
  budget numeric default 0,
  status text default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.api_clients (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  public_key text unique,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.platform_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date default current_date,
  total_universities integer default 0,
  total_students integer default 0,
  total_posts integer default 0,
  total_events integer default 0,
  total_marketplace_items integer default 0,
  total_elections integer default 0,
  created_at timestamptz default now()
);

alter table public.subscription_plans enable row level security;
alter table public.university_subscriptions enable row level security;
alter table public.white_label_settings enable row level security;
alter table public.campus_ambassadors enable row level security;
alter table public.referrals enable row level security;
alter table public.sponsor_campaigns enable row level security;
alter table public.api_clients enable row level security;
alter table public.platform_metrics enable row level security;

drop policy if exists "plans read" on public.subscription_plans;
create policy "plans read"
on public.subscription_plans for select to authenticated using (true);

drop policy if exists "plans manage super admin" on public.subscription_plans;
create policy "plans manage super admin"
on public.subscription_plans for all to authenticated
using (public.current_user_role() = 'super_admin')
with check (public.current_user_role() = 'super_admin');

drop policy if exists "subscriptions admins read" on public.university_subscriptions;
create policy "subscriptions admins read"
on public.university_subscriptions for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or university_id = public.current_user_university_id()
);

drop policy if exists "subscriptions manage super admin" on public.university_subscriptions;
create policy "subscriptions manage super admin"
on public.university_subscriptions for all to authenticated
using (public.current_user_role() = 'super_admin')
with check (public.current_user_role() = 'super_admin');

drop policy if exists "white label read same university" on public.white_label_settings;
create policy "white label read same university"
on public.white_label_settings for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or university_id = public.current_user_university_id()
);

drop policy if exists "white label manage admins" on public.white_label_settings;
create policy "white label manage admins"
on public.white_label_settings for all to authenticated
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

drop policy if exists "ambassadors read same university" on public.campus_ambassadors;
create policy "ambassadors read same university"
on public.campus_ambassadors for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or university_id = public.current_user_university_id()
);

drop policy if exists "ambassadors manage admins" on public.campus_ambassadors;
create policy "ambassadors manage admins"
on public.campus_ambassadors for all to authenticated
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

drop policy if exists "referrals own read" on public.referrals;
create policy "referrals own read"
on public.referrals for select to authenticated
using (
  referrer_id = auth.uid()
  or referred_user_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "referrals create" on public.referrals;
create policy "referrals create"
on public.referrals for insert to authenticated
with check (
  referred_user_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "sponsor campaigns read active" on public.sponsor_campaigns;
create policy "sponsor campaigns read active"
on public.sponsor_campaigns for select to authenticated
using (
  status = 'active'
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "sponsor campaigns manage admins" on public.sponsor_campaigns;
create policy "sponsor campaigns manage admins"
on public.sponsor_campaigns for all to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and (university_id is null or university_id = public.current_user_university_id())
  )
)
with check (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and (university_id is null or university_id = public.current_user_university_id())
  )
);

drop policy if exists "api clients admins" on public.api_clients;
create policy "api clients admins"
on public.api_clients for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "api clients manage admins" on public.api_clients;
create policy "api clients manage admins"
on public.api_clients for all to authenticated
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

drop policy if exists "platform metrics super admin" on public.platform_metrics;
create policy "platform metrics super admin"
on public.platform_metrics for select to authenticated
using (public.current_user_role() = 'super_admin');

drop policy if exists "platform metrics insert super admin" on public.platform_metrics;
create policy "platform metrics insert super admin"
on public.platform_metrics for insert to authenticated
with check (public.current_user_role() = 'super_admin');

create index if not exists idx_university_subscriptions_university on public.university_subscriptions(university_id);
create index if not exists idx_sponsor_campaigns_university on public.sponsor_campaigns(university_id, status);
create index if not exists idx_referrals_university on public.referrals(university_id, created_at);
create index if not exists idx_api_clients_university on public.api_clients(university_id);

insert into public.subscription_plans (name, price, billing_cycle, max_students, features)
values
  ('Starter Campus', 500, 'monthly', 1000, '{"feed": true, "communities": true, "events": true}'),
  ('Growth Campus', 1500, 'monthly', 5000, '{"feed": true, "communities": true, "events": true, "marketplace": true, "elections": true}'),
  ('Enterprise Campus', 5000, 'monthly', null, '{"all": true, "white_label": true, "api": true, "analytics": true}')
on conflict do nothing;
