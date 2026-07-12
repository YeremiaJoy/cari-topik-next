-- CariTopik schema: profiles, questions, rooms, app_config, announcements.
-- Roles are backend-owned: everyone signs up as 'guest'; admins are promoted
-- manually in the database (update profiles set role = 'admin' where email = ...).

-- ===== enums =====
create type public.plan as enum ('free', 'pro');
create type public.user_role as enum ('admin', 'guest');
create type public.question_category as enum ('pasangan', 'teman', 'keluarga');
create type public.question_depth as enum ('ringan', 'sedang', 'dalam');
create type public.question_bias as enum ('introvert', 'extrovert', 'netral');
create type public.room_status as enum ('active', 'completed');

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  avatar_url text not null default '',
  plan public.plan not null default 'free',
  role public.user_role not null default 'guest',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create profile on signup; role defaults to 'guest', never set by the client.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security definer so profile policies can reference it without RLS recursion.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ===== questions =====
create table public.questions (
  id text primary key,
  text_id text not null,
  text_en text not null,
  category public.question_category not null,
  depth public.question_depth not null,
  bias public.question_bias not null,
  for_group boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;

-- ===== rooms =====
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  participant_count int not null check (participant_count >= 2),
  category public.question_category not null,
  personalities jsonb,
  deck text[] not null,
  current_index int not null default 0,
  favorites text[] not null default '{}',
  status public.room_status not null default 'active',
  -- Index of the first card in the current free-quota window.
  window_start int,
  -- When the window's last card was played; quota resets 6h later.
  exhausted_at timestamptz,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index rooms_user_id_idx on public.rooms (user_id);
alter table public.rooms enable row level security;

-- ===== app_config (single row) =====
create table public.app_config (
  id boolean primary key default true check (id),
  free_max_participants int not null default 2,
  free_max_questions int not null default 5,
  free_max_rooms int not null default 1,
  pro_price int not null default 50000,
  pro_price_after_discount int not null default 19000,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;

insert into public.app_config default values;

-- ===== announcements (single row) =====
create table public.announcements (
  id boolean primary key default true check (id),
  message_id text not null default '',
  message_en text not null default '',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

insert into public.announcements default values;

-- ===== RPCs =====
-- Instant upgrade, same semantics as the mock until payment exists.
create function public.upgrade_to_pro()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.profiles set plan = 'pro' where id = auth.uid() returning * into result;
  return result;
end;
$$;

-- Delete own account; cascades profile and rooms via FKs.
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.upgrade_to_pro() from anon, public;
revoke execute on function public.delete_account() from anon, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ===== RLS policies =====
-- profiles: read own; admins read/update/delete everyone. Plan changes go through RPCs.
create policy "profiles select own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles admin update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
create policy "profiles admin delete" on public.profiles
  for delete using (public.is_admin());

-- questions: any signed-in user reads; admins write.
create policy "questions select authenticated" on public.questions
  for select to authenticated using (true);
create policy "questions admin insert" on public.questions
  for insert with check (public.is_admin());
create policy "questions admin update" on public.questions
  for update using (public.is_admin()) with check (public.is_admin());
create policy "questions admin delete" on public.questions
  for delete using (public.is_admin());

-- rooms: owner-only; admins can read all (stats).
create policy "rooms owner all" on public.rooms
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "rooms admin select" on public.rooms
  for select using (public.is_admin());

-- app_config / announcements: any signed-in user reads; admins update.
create policy "app_config select authenticated" on public.app_config
  for select to authenticated using (true);
create policy "app_config admin update" on public.app_config
  for update using (public.is_admin()) with check (public.is_admin());

create policy "announcements select authenticated" on public.announcements
  for select to authenticated using (true);
create policy "announcements admin update" on public.announcements
  for update using (public.is_admin()) with check (public.is_admin());
