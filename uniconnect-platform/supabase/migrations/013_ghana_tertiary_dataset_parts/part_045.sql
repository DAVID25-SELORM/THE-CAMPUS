-- Ghana Tertiary UniConnect Dataset - part 45
-- Run parts sequentially in Supabase SQL Editor.

insert into public.app_catalog_items (id,type,name) values ('hall_types_off_campus_residence','hall_types','Off-campus Residence') on conflict (id) do update set name=excluded.name;
