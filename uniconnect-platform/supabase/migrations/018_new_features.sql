-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  UniConnect — Phase 8: Full Feature Expansion                   ║
-- ║  Study Resources, Timetable, News, Reviews, Hostel, Tutors,    ║
-- ║  Post Reactions, Theme, Alumni, Search, Push Subscriptions      ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── 1. Study Resources ───────────────────────────────────────────────────────
create table if not exists public.study_resources (
  id                uuid primary key default gen_random_uuid(),
  university_id     uuid references public.universities(id) on delete cascade,
  faculty_id        uuid references public.faculties(id) on delete set null,
  department_id     uuid references public.departments(id) on delete set null,
  course_id         uuid references public.courses(id) on delete set null,
  uploader_id       uuid references public.profiles(id) on delete cascade,
  title             text not null,
  description       text,
  resource_type     text not null default 'notes',  -- notes|past_paper|textbook|slides|other
  file_url          text,
  file_name         text,
  file_size         bigint,
  download_count    int not null default 0,
  academic_year     text,
  level             text,
  created_at        timestamptz default now()
);

alter table public.study_resources enable row level security;
create policy "read resources in same university" on public.study_resources
  for select to authenticated using (
    university_id = (select university_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );
create policy "upload own resources" on public.study_resources
  for insert to authenticated with check (uploader_id = auth.uid());
create policy "delete own resources" on public.study_resources
  for delete to authenticated using (uploader_id = auth.uid());

-- ── 2. Academic Timetable ────────────────────────────────────────────────────
create table if not exists public.timetable_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  course_name   text not null,
  course_code   text,
  lecturer      text,
  day_of_week   int not null check (day_of_week between 0 and 6), -- 0=Mon
  start_time    time not null,
  end_time      time not null,
  venue         text,
  entry_type    text not null default 'lecture',  -- lecture|lab|tutorial|exam|other
  color         text not null default '#00f5ff',
  created_at    timestamptz default now()
);

alter table public.timetable_entries enable row level security;
create policy "own timetable" on public.timetable_entries
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 3. Exam Schedule ─────────────────────────────────────────────────────────
create table if not exists public.exam_schedule (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id) on delete cascade,
  course_name   text not null,
  course_code   text,
  exam_date     timestamptz not null,
  venue         text,
  duration_mins int,
  notes         text,
  created_at    timestamptz default now()
);

alter table public.exam_schedule enable row level security;
create policy "own exams" on public.exam_schedule
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 4. Campus News & Announcements ──────────────────────────────────────────
create table if not exists public.campus_news (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid references public.universities(id) on delete cascade,
  author_id      uuid references public.profiles(id) on delete set null,
  title          text not null,
  body           text not null,
  category       text not null default 'general',  -- general|academic|sports|health|emergency
  is_pinned      boolean not null default false,
  is_emergency   boolean not null default false,
  cover_url      text,
  created_at     timestamptz default now()
);

alter table public.campus_news enable row level security;
create policy "read news in university" on public.campus_news
  for select to authenticated using (
    university_id = (select university_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );
create policy "admin post news" on public.campus_news
  for insert to authenticated with check (
    (select role from public.profiles where id = auth.uid()) in ('super_admin','university_admin')
  );
create policy "admin update news" on public.campus_news
  for update to authenticated using (
    (select role from public.profiles where id = auth.uid()) in ('super_admin','university_admin')
  );
create policy "admin delete news" on public.campus_news
  for delete to authenticated using (
    (select role from public.profiles where id = auth.uid()) in ('super_admin','university_admin')
  );

-- ── 5. Course Reviews ────────────────────────────────────────────────────────
create table if not exists public.course_reviews (
  id              uuid primary key default gen_random_uuid(),
  university_id   uuid references public.universities(id) on delete cascade,
  course_id       uuid references public.courses(id) on delete cascade,
  reviewer_id     uuid references public.profiles(id) on delete cascade,
  course_name     text,
  lecturer_name   text,
  rating          int not null check (rating between 1 and 5),
  difficulty      int check (difficulty between 1 and 5),
  workload        int check (workload between 1 and 5),
  review          text,
  academic_year   text,
  anonymous       boolean not null default true,
  created_at      timestamptz default now(),
  unique(course_id, reviewer_id)
);

alter table public.course_reviews enable row level security;
create policy "read course reviews in university" on public.course_reviews
  for select to authenticated using (
    university_id = (select university_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );
create policy "write own review" on public.course_reviews
  for insert to authenticated with check (reviewer_id = auth.uid());
create policy "update own review" on public.course_reviews
  for update to authenticated using (reviewer_id = auth.uid());
create policy "delete own review" on public.course_reviews
  for delete to authenticated using (reviewer_id = auth.uid());

-- ── 6. Hostel Listings ───────────────────────────────────────────────────────
create table if not exists public.hostel_listings (
  id                    uuid primary key default gen_random_uuid(),
  university_id         uuid references public.universities(id) on delete cascade,
  lister_id             uuid references public.profiles(id) on delete cascade,
  name                  text not null,
  description           text,
  address               text,
  price_per_semester    numeric not null default 0,
  room_type             text not null default 'single',  -- single|double|self-contained|apartment
  amenities             text[] default '{}',
  contact_phone         text,
  photos                text[] default '{}',
  available_rooms       int not null default 1,
  gender_type           text default 'mixed',  -- male|female|mixed
  verified              boolean not null default false,
  status                text not null default 'available',  -- available|full|unavailable
  created_at            timestamptz default now()
);

alter table public.hostel_listings enable row level security;
create policy "read hostels in university" on public.hostel_listings
  for select to authenticated using (
    university_id = (select university_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );
create policy "list own hostel" on public.hostel_listings
  for insert to authenticated with check (lister_id = auth.uid());
create policy "update own hostel" on public.hostel_listings
  for update to authenticated using (lister_id = auth.uid());
create policy "delete own hostel" on public.hostel_listings
  for delete to authenticated using (lister_id = auth.uid());

-- ── 7. Tutor Listings ────────────────────────────────────────────────────────
create table if not exists public.tutor_listings (
  id              uuid primary key default gen_random_uuid(),
  university_id   uuid references public.universities(id) on delete cascade,
  tutor_id        uuid references public.profiles(id) on delete cascade,
  subject         text not null,
  description     text,
  rate_per_hour   numeric not null default 0,
  mode            text not null default 'both',  -- online|physical|both
  contact_phone   text,
  available       boolean not null default true,
  rating          numeric default 0,
  sessions_count  int not null default 0,
  created_at      timestamptz default now()
);

alter table public.tutor_listings enable row level security;
create policy "read tutors in university" on public.tutor_listings
  for select to authenticated using (
    university_id = (select university_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_admin'
  );
create policy "list as tutor" on public.tutor_listings
  for insert to authenticated with check (tutor_id = auth.uid());
create policy "update own tutor listing" on public.tutor_listings
  for update to authenticated using (tutor_id = auth.uid());

-- ── 8. Post Reactions (extended emoji reactions) ──────────────────────────────
create table if not exists public.post_reactions (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid references public.posts(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  reaction_type   text not null default 'like',  -- like|love|laugh|wow|sad|fire
  created_at      timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_reactions enable row level security;
create policy "read reactions" on public.post_reactions
  for select to authenticated using (true);
create policy "own reaction" on public.post_reactions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 9. Theme preference (add column to profiles) ─────────────────────────────
alter table public.profiles add column if not exists theme text default 'dark';
alter table public.profiles add column if not exists academic_year_graduation text;
alter table public.profiles add column if not exists is_alumni boolean default false;
alter table public.profiles add column if not exists graduation_year int;

-- ── 10. Push Notification Subscriptions ─────────────────────────────────────
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  subscription  jsonb not null,
  user_agent    text,
  created_at    timestamptz default now(),
  unique(user_id)
);

alter table public.push_subscriptions enable row level security;
create policy "own push subscription" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 11. Alumni Network ───────────────────────────────────────────────────────
create table if not exists public.alumni_profiles (
  id                  uuid primary key references public.profiles(id) on delete cascade,
  university_id       uuid references public.universities(id) on delete cascade,
  graduation_year     int,
  programme_name      text,
  job_title           text,
  current_company     text,
  current_location    text,
  linkedin_url        text,
  open_to_mentoring   boolean not null default false,
  bio                 text,
  created_at          timestamptz default now()
);

alter table public.alumni_profiles enable row level security;
create policy "read alumni" on public.alumni_profiles
  for select to authenticated using (true);
create policy "own alumni profile" on public.alumni_profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── 12. Resource downloads tracking ────────────────────────────────────────
create table if not exists public.resource_downloads (
  id            uuid primary key default gen_random_uuid(),
  resource_id   uuid references public.study_resources(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  created_at    timestamptz default now(),
  unique(resource_id, user_id)
);

alter table public.resource_downloads enable row level security;
create policy "track downloads" on public.resource_downloads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 13. News reads ───────────────────────────────────────────────────────────
create table if not exists public.news_reads (
  id          uuid primary key default gen_random_uuid(),
  news_id     uuid references public.campus_news(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(news_id, user_id)
);

alter table public.news_reads enable row level security;
create policy "track news reads" on public.news_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
