-- Supabase schema and server-side access rules for the shared trip message board.
-- Run once in the Supabase SQL editor. The frontend publishable key is safe only
-- because these RLS policies bind every write to the signed-in anonymous user.

create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  user_id uuid not null,
  nickname text not null check (char_length(trim(nickname)) between 1 and 20),
  trip_date text not null check (trip_date in ('all', '8/30', '8/31', '9/1', '9/2', '9/3', '9/4', '9/5')),
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_message_likes (
  message_id uuid not null references public.trip_messages(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.trip_messages enable row level security;
alter table public.trip_message_likes enable row level security;

grant select, insert, delete on public.trip_messages to authenticated;
grant select, insert, delete on public.trip_message_likes to authenticated;

drop policy if exists "Trip members can read messages" on public.trip_messages;
create policy "Trip members can read messages"
on public.trip_messages for select to authenticated
using (trip_id = 'busan-2026');

drop policy if exists "Trip members can create their own messages" on public.trip_messages;
create policy "Trip members can create their own messages"
on public.trip_messages for insert to authenticated
with check (
  trip_id = 'busan-2026'
  and user_id = (select auth.uid())
);

drop policy if exists "Trip members can delete their own messages" on public.trip_messages;
drop policy if exists "Trip members can delete messages" on public.trip_messages;
create policy "Trip members can delete messages"
on public.trip_messages for delete to authenticated
using (trip_id = 'busan-2026');

drop policy if exists "Trip members can read likes" on public.trip_message_likes;
create policy "Trip members can read likes"
on public.trip_message_likes for select to authenticated
using (
  exists (
    select 1 from public.trip_messages
    where trip_messages.id = trip_message_likes.message_id
      and trip_messages.trip_id = 'busan-2026'
  )
);

drop policy if exists "Trip members can add their own like" on public.trip_message_likes;
create policy "Trip members can add their own like"
on public.trip_message_likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.trip_messages
    where trip_messages.id = trip_message_likes.message_id
      and trip_messages.trip_id = 'busan-2026'
  )
);

drop policy if exists "Trip members can remove their own like" on public.trip_message_likes;
create policy "Trip members can remove their own like"
on public.trip_message_likes for delete to authenticated
using (user_id = (select auth.uid()));
