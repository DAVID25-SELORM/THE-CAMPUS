-- UniConnect Phase 7 completion: mobile/PWA, national ID, payments, ads, settlements
-- Run AFTER 010_enterprise_national_expansion.sql.

create table if not exists public.national_id_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  provider text default 'manual',
  national_id_hash text,
  verification_reference text unique,
  status text default 'pending',
  verified_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, provider)
);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  subscription_id uuid references public.university_subscriptions(id) on delete set null,
  provider text default 'manual',
  amount numeric default 0,
  currency text default 'GHS',
  reference text unique default encode(gen_random_bytes(10), 'hex'),
  checkout_url text,
  status text default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete set null,
  name text not null,
  placement_key text unique not null,
  surface text default 'feed',
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.sponsor_campaigns(id) on delete cascade,
  placement_id uuid references public.ad_placements(id) on delete set null,
  title text not null,
  body text,
  image_url text,
  target_url text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid references public.ad_creatives(id) on delete cascade,
  university_id uuid references public.universities(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  revenue numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.financial_settlements (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  settlement_type text default 'platform',
  provider text default 'manual',
  gross_amount numeric default 0,
  platform_fee numeric default 0,
  net_amount numeric default 0,
  currency text default 'GHS',
  status text default 'pending',
  reference text unique default encode(gen_random_bytes(10), 'hex'),
  settled_at timestamptz,
  created_at timestamptz default now()
);

alter table public.national_id_verifications enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.ad_placements enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_events enable row level security;
alter table public.financial_settlements enable row level security;

drop policy if exists "national id read own_or_admin" on public.national_id_verifications;
create policy "national id read own_or_admin"
on public.national_id_verifications for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "national id create own" on public.national_id_verifications;
create policy "national id create own"
on public.national_id_verifications for insert to authenticated
with check (
  user_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "national id update admins" on public.national_id_verifications;
create policy "national id update admins"
on public.national_id_verifications for update to authenticated
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

drop policy if exists "subscription payments read admins" on public.subscription_payments;
create policy "subscription payments read admins"
on public.subscription_payments for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "subscription payments create admins" on public.subscription_payments;
create policy "subscription payments create admins"
on public.subscription_payments for insert to authenticated
with check (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "ads placements read active" on public.ad_placements;
create policy "ads placements read active"
on public.ad_placements for select to authenticated
using (
  active = true
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "ads placements manage admins" on public.ad_placements;
create policy "ads placements manage admins"
on public.ad_placements for all to authenticated
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

drop policy if exists "ads creatives read active" on public.ad_creatives;
create policy "ads creatives read active"
on public.ad_creatives for select to authenticated
using (
  status = 'active'
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "ads creatives manage admins" on public.ad_creatives;
create policy "ads creatives manage admins"
on public.ad_creatives for all to authenticated
using (public.current_user_role() in ('super_admin','university_admin'))
with check (public.current_user_role() in ('super_admin','university_admin'));

drop policy if exists "ad events create authenticated" on public.ad_events;
create policy "ad events create authenticated"
on public.ad_events for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    university_id is null
    or university_id = public.current_user_university_id()
  )
);

drop policy if exists "ad events read admins" on public.ad_events;
create policy "ad events read admins"
on public.ad_events for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and (university_id is null or university_id = public.current_user_university_id())
  )
);

drop policy if exists "settlements read admins" on public.financial_settlements;
create policy "settlements read admins"
on public.financial_settlements for select to authenticated
using (
  public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "settlements manage admins" on public.financial_settlements;
create policy "settlements manage admins"
on public.financial_settlements for all to authenticated
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

create index if not exists idx_national_id_user on public.national_id_verifications(user_id);
create index if not exists idx_subscription_payments_university on public.subscription_payments(university_id, created_at);
create index if not exists idx_ad_creatives_campaign on public.ad_creatives(campaign_id);
create index if not exists idx_ad_events_creative on public.ad_events(creative_id, event_type);
create index if not exists idx_settlements_university on public.financial_settlements(university_id, created_at);

insert into public.ad_placements (name, placement_key, surface)
values
  ('Feed Sponsored Card', 'feed_sponsored_card', 'feed'),
  ('Marketplace Banner', 'marketplace_banner', 'marketplace'),
  ('Events Sponsor Strip', 'events_sponsor_strip', 'events'),
  ('Career Partner Slot', 'career_partner_slot', 'career')
on conflict (placement_key) do nothing;
