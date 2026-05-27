# UniConnect Platform

A production-ready MVP foundation for a multi-tenant university student platform.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/migrations/001_init.sql`.
4. Add your project URL and anon key to `.env`.

## Default Modules

- Auth
- Student verification
- Feed
- Communities
- Marketplace
- Events
- Elections placeholder
- Messages placeholder
- Profile
- Admin dashboard
- Supabase RLS policies

## Important

Every important table is scoped by `university_id`.
