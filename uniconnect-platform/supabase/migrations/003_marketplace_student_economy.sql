
-- Phase 3 Marketplace & Student Economy

create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz default now()
);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  item_id uuid references public.marketplace_items(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete cascade,
  quantity integer default 1,
  total_amount numeric default 0,
  status text default 'pending',
  payment_status text default 'unpaid',
  delivery_method text default 'meetup',
  created_at timestamptz default now()
);

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  item_id uuid references public.marketplace_items(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  review text,
  created_at timestamptz default now(),
  unique(item_id, reviewer_id)
);

create table if not exists public.student_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  balance numeric default 0,
  currency text default 'GHS',
  created_at timestamptz default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references public.student_wallets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  amount numeric not null,
  reference text,
  status text default 'completed',
  created_at timestamptz default now()
);

create table if not exists public.vendor_verifications (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  seller_id uuid unique references public.profiles(id) on delete cascade,
  business_name text,
  contact_phone text,
  status text default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  order_id uuid references public.marketplace_orders(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete cascade,
  provider text default 'manual',
  amount numeric not null default 0,
  currency text default 'GHS',
  status text default 'pending',
  reference text unique default encode(gen_random_bytes(10), 'hex'),
  checkout_url text,
  created_at timestamptz default now()
);

alter table public.marketplace_items
add column if not exists category_id uuid references public.marketplace_categories(id) on delete set null;

alter table public.marketplace_items
add column if not exists item_type text default 'product';

alter table public.marketplace_items
add column if not exists contact_phone text;

alter table public.marketplace_items
add column if not exists delivery_method text default 'meetup';

alter table public.marketplace_items
add column if not exists vendor_verified boolean default false;

alter table public.marketplace_categories enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_reviews enable row level security;
alter table public.student_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.vendor_verifications enable row level security;
alter table public.payment_intents enable row level security;

drop policy if exists "marketplace categories read" on public.marketplace_categories;
create policy "marketplace categories read"
on public.marketplace_categories
for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "marketplace categories manage admins" on public.marketplace_categories;
create policy "marketplace categories manage admins"
on public.marketplace_categories
for all to authenticated
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

drop policy if exists "orders own read" on public.marketplace_orders;
create policy "orders own read"
on public.marketplace_orders
for select to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
  or public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "orders create" on public.marketplace_orders;
create policy "orders create"
on public.marketplace_orders
for insert to authenticated
with check (
  buyer_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "orders update participants" on public.marketplace_orders;
create policy "orders update participants"
on public.marketplace_orders
for update to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
)
with check (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
  or public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "reviews update own" on public.marketplace_reviews;
create policy "reviews update own"
on public.marketplace_reviews
for update to authenticated
using (reviewer_id = auth.uid())
with check (
  reviewer_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "reviews read" on public.marketplace_reviews;
create policy "reviews read"
on public.marketplace_reviews
for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "reviews create" on public.marketplace_reviews;
create policy "reviews create"
on public.marketplace_reviews
for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "wallet own read" on public.student_wallets;
create policy "wallet own read"
on public.student_wallets
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "wallet own create" on public.student_wallets;
create policy "wallet own create"
on public.student_wallets
for insert to authenticated
with check (
  user_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "wallet tx own read" on public.wallet_transactions;
create policy "wallet tx own read"
on public.wallet_transactions
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "vendor verification read campus" on public.vendor_verifications;
create policy "vendor verification read campus"
on public.vendor_verifications
for select to authenticated
using (
  university_id = public.current_user_university_id()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists "vendor verification create own" on public.vendor_verifications;
create policy "vendor verification create own"
on public.vendor_verifications
for insert to authenticated
with check (
  seller_id = auth.uid()
  and university_id = public.current_user_university_id()
);

drop policy if exists "vendor verification update own_or_admin" on public.vendor_verifications;
drop policy if exists "vendor verification update admins" on public.vendor_verifications;
create policy "vendor verification update admins"
on public.vendor_verifications
for update to authenticated
using (
  public.current_user_role() in ('super_admin','university_admin')
)
with check (
  public.current_user_role() in ('super_admin','university_admin')
);

drop policy if exists "payment intents read participants" on public.payment_intents;
create policy "payment intents read participants"
on public.payment_intents
for select to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
  or public.current_user_role() = 'super_admin'
  or (
    public.current_user_role() = 'university_admin'
    and university_id = public.current_user_university_id()
  )
);

drop policy if exists "payment intents create buyer" on public.payment_intents;
create policy "payment intents create buyer"
on public.payment_intents
for insert to authenticated
with check (
  buyer_id = auth.uid()
  and university_id = public.current_user_university_id()
);

create index if not exists idx_marketplace_orders_buyer on public.marketplace_orders(buyer_id);
create index if not exists idx_marketplace_orders_seller on public.marketplace_orders(seller_id);
create index if not exists idx_marketplace_reviews_item on public.marketplace_reviews(item_id);
create unique index if not exists idx_marketplace_reviews_item_reviewer_unique on public.marketplace_reviews(item_id, reviewer_id);
create index if not exists idx_wallet_transactions_user on public.wallet_transactions(user_id, created_at);
create index if not exists idx_vendor_verifications_seller on public.vendor_verifications(seller_id);
create index if not exists idx_payment_intents_order on public.payment_intents(order_id);

insert into public.marketplace_categories (university_id, name, icon)
select u.id, seed.name, seed.icon
from public.universities u
cross join (
  values
    ('Books', 'book'),
    ('Electronics', 'laptop'),
    ('Fashion', 'shirt'),
    ('Food', 'utensils'),
    ('Student Services', 'briefcase'),
    ('Tutoring', 'graduation-cap')
) as seed(name, icon)
where not exists (
  select 1
  from public.marketplace_categories c
  where c.university_id = u.id
    and c.name = seed.name
);
