-- Obsidian Chess Club: cole todo este arquivo no Supabase > SQL Editor > New query > Run.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
 elo_online integer not null default 800 check (elo_online between 100 and 4000),
 elo_ai integer not null default 800 check (elo_ai between 100 and 4000),
 wins integer not null default 0, losses integer not null default 0, draws integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.friendships (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references public.profiles(id) on delete cascade,
 addressee_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 constraint friendship_not_self check (requester_id <> addressee_id),
 constraint friendship_pair_unique unique(requester_id,addressee_id)
);
create index if not exists profiles_elo_online_idx on public.profiles(elo_online desc);
create index if not exists friendships_addressee_status_idx on public.friendships(addressee_id,status);
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
create policy "profiles readable by everyone" on public.profiles for select using (true);
create policy "user inserts own profile" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "user updates own profile" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
-- Clients may edit only username; ELO and match statistics must be changed server-side.
revoke update on public.profiles from authenticated;
grant update (username) on public.profiles to authenticated;
create policy "friendship visible to participants" on public.friendships for select to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id);
create policy "send friend request as self" on public.friendships for insert to authenticated with check (auth.uid()=requester_id and status='pending');
create policy "recipient accepts request" on public.friendships for update to authenticated using (auth.uid()=addressee_id and status='pending') with check (auth.uid()=addressee_id and status='accepted');
create policy "participants remove friendship" on public.friendships for delete to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id);
-- Create profile automatically when auth user is created. username comes from sign-up metadata.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare candidate text;
begin
 candidate := lower(coalesce(new.raw_user_meta_data->>'username', 'player_' || substr(replace(new.id::text, '-', ''), 1, 8)));
 insert into public.profiles(id,username) values(new.id,candidate) on conflict(id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- NOTE: this schema does not award online ELO. Do not let browser clients edit elo_online or match outcomes.
-- A secure server-side Edge Function should validate a completed game and update both ratings atomically.
