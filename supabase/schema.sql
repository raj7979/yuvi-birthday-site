-- Yuvaan birthday RSVP and photo schema
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guest_name text not null,
  display_name text not null,
  attendance text not null check (attendance in ('going', 'maybe', 'not_going')),
  guest_count integer not null default 1 check (guest_count between 0 and 10),
  favorite_team text,
  contact text,
  message text,
  is_public boolean not null default true
);

alter table public.rsvps enable row level security;

revoke all on table public.rsvps from anon, authenticated;
grant insert on table public.rsvps to anon, authenticated;

drop policy if exists "Guests can submit RSVPs" on public.rsvps;
create policy "Guests can submit RSVPs"
on public.rsvps
for insert
to anon, authenticated
with check (
  length(trim(guest_name)) between 1 and 80
  and length(trim(display_name)) between 1 and 80
  and attendance in ('going', 'maybe', 'not_going')
  and guest_count between 0 and 10
  and coalesce(length(favorite_team), 0) <= 60
  and coalesce(length(contact), 0) <= 120
  and coalesce(length(message), 0) <= 240
);

create or replace function public.get_rsvp_summary()
returns table (
  going_count bigint,
  maybe_count bigint,
  not_going_count bigint,
  total_people bigint,
  public_names text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select
      count(*) filter (where attendance = 'going') as going_count,
      count(*) filter (where attendance = 'maybe') as maybe_count,
      count(*) filter (where attendance = 'not_going') as not_going_count,
      coalesce(sum(guest_count) filter (where attendance = 'going'), 0) as total_people
    from public.rsvps
  ),
  names as (
    select coalesce(array_agg(name order by created_at desc), '{}'::text[]) as public_names
    from (
      select display_name as name, created_at
      from public.rsvps
      where attendance = 'going'
        and is_public = true
        and length(trim(display_name)) > 0
      order by created_at desc
      limit 50
    ) visible_names
  )
  select
    counts.going_count,
    counts.maybe_count,
    counts.not_going_count,
    counts.total_people,
    names.public_names
  from counts, names;
$$;

revoke all on function public.get_rsvp_summary() from public;
grant execute on function public.get_rsvp_summary() to anon, authenticated;

create table if not exists public.party_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  uploader_name text,
  caption text,
  file_path text not null,
  public_url text not null,
  approved boolean not null default true
);

alter table public.party_photos enable row level security;

grant select, insert on table public.party_photos to anon, authenticated;

drop policy if exists "Guests can add party photo metadata" on public.party_photos;
create policy "Guests can add party photo metadata"
on public.party_photos
for insert
to anon, authenticated
with check (
  length(trim(file_path)) > 0
  and length(trim(public_url)) > 0
  and coalesce(length(uploader_name), 0) <= 80
  and coalesce(length(caption), 0) <= 140
);

drop policy if exists "Guests can view approved party photos" on public.party_photos;
create policy "Guests can view approved party photos"
on public.party_photos
for select
to anon, authenticated
using (approved = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'yuvi-party-photos',
  'yuvi-party-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Guests can upload party photos" on storage.objects;
create policy "Guests can upload party photos"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'yuvi-party-photos'
  and (storage.foldername(name))[1] = 'party'
);

drop policy if exists "Guests can view party photos" on storage.objects;
create policy "Guests can view party photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'yuvi-party-photos');
