-- Room lifecycle + admin RPCs. All room mutations go through SECURITY DEFINER
-- functions so free-plan quotas are enforced server-side and cannot be bypassed
-- by calling the REST API directly.

-- ===== policy changes =====
-- Pricing page and announcement banner are visible before login (matches mock).
drop policy "app_config select authenticated" on public.app_config;
create policy "app_config select all" on public.app_config
  for select using (true);

drop policy "announcements select authenticated" on public.announcements;
create policy "announcements select all" on public.announcements
  for select using (true);

-- Rooms become read-only via PostgREST; mutations only via RPCs below.
drop policy "rooms owner all" on public.rooms;
create policy "rooms owner select" on public.rooms
  for select using (user_id = auth.uid());

-- ===== room RPCs =====
-- Deck composition is built client-side (not monetization-sensitive; any
-- signed-in user can read the whole question bank). Quotas are enforced here.

create function public.create_room(
  p_participant_count int,
  p_category public.question_category,
  p_personalities jsonb,
  p_deck text[]
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.plan;
  v_cfg public.app_config;
  v_room public.rooms;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_deck is null or coalesce(array_length(p_deck, 1), 0) = 0 then
    raise exception 'Deck kosong.';
  end if;
  select plan into v_plan from public.profiles where id = auth.uid();
  select * into v_cfg from public.app_config limit 1;
  if v_plan = 'free' and p_participant_count > v_cfg.free_max_participants then
    raise exception 'paywall:participants';
  end if;
  if v_plan = 'free'
     and (select count(*) from public.rooms where user_id = auth.uid()) >= v_cfg.free_max_rooms then
    raise exception 'paywall:rooms';
  end if;
  insert into public.rooms (user_id, participant_count, category, personalities, deck, window_start)
  values (auth.uid(), p_participant_count, p_category, p_personalities, p_deck, 0)
  returning * into v_room;
  return v_room;
end;
$$;

-- Mirrors the mock quota logic: free plan gets free_max_questions cards per
-- window; the window reopens 6 hours after its last card was played.
create function public.advance_card(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_plan public.plan;
  v_cfg public.app_config;
  v_next int;
  v_ws int;
  v_ex timestamptz;
  v_reset timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_room from public.rooms
    where id = p_room_id and user_id = auth.uid()
    for update;
  if not found then
    raise exception 'Room tidak ditemukan.';
  end if;
  v_next := v_room.current_index + 1;
  if v_next >= coalesce(array_length(v_room.deck, 1), 0) then
    update public.rooms set status = 'completed', ended_at = now()
      where id = p_room_id returning * into v_room;
    return v_room;
  end if;
  select plan into v_plan from public.profiles where id = auth.uid();
  if v_plan <> 'free' then
    update public.rooms set current_index = v_next
      where id = p_room_id returning * into v_room;
    return v_room;
  end if;
  select * into v_cfg from public.app_config limit 1;
  v_ws := coalesce(v_room.window_start, 0);
  v_ex := v_room.exhausted_at;
  if v_next - v_ws >= v_cfg.free_max_questions then
    -- Window exhausted; reopens 6h after the last card was played.
    v_reset := coalesce(v_ex + interval '6 hours', now());
    if now() < v_reset then
      raise exception 'paywall:questions'
        using detail = to_char(v_reset at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    end if;
    v_ws := v_next;
    v_ex := null;
  end if;
  if v_next - v_ws = v_cfg.free_max_questions - 1 then
    v_ex := now();
  end if;
  update public.rooms
    set current_index = v_next, window_start = v_ws, exhausted_at = v_ex
    where id = p_room_id returning * into v_room;
  return v_room;
end;
$$;

create function public.toggle_favorite(p_room_id uuid, p_question_id text)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.rooms
    set favorites = case
      when p_question_id = any (favorites) then array_remove(favorites, p_question_id)
      else favorites || p_question_id
    end
    where id = p_room_id and user_id = auth.uid()
    returning * into v_room;
  if not found then
    raise exception 'Room tidak ditemukan.';
  end if;
  return v_room;
end;
$$;

create function public.end_session(p_room_id uuid)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.rooms
    set status = 'completed', ended_at = now()
    where id = p_room_id and user_id = auth.uid()
    returning * into v_room;
  if not found then
    raise exception 'Room tidak ditemukan.';
  end if;
  return v_room;
end;
$$;

create function public.delete_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_plan public.plan;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_room from public.rooms
    where id = p_room_id and user_id = auth.uid();
  if not found then
    raise exception 'Room tidak ditemukan.';
  end if;
  if v_room.status <> 'completed' then
    raise exception 'Room masih aktif. Akhiri sesi dulu sebelum menghapus.';
  end if;
  select plan into v_plan from public.profiles where id = auth.uid();
  if v_plan = 'free'
     and now() < coalesce(v_room.ended_at, v_room.created_at) + interval '6 hours' then
    raise exception 'Room baru bisa dihapus 6 jam setelah selesai.';
  end if;
  delete from public.rooms where id = p_room_id;
end;
$$;

-- ===== admin RPCs =====
-- Deletes the whole account (auth.users row cascades to profile and rooms),
-- not just the profile — a bare profile delete would leave a broken auth user.
create function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Tidak bisa menghapus akun sendiri dari sini.';
  end if;
  delete from auth.users where id = p_user_id;
  -- In case the profile exists without an auth row.
  delete from public.profiles where id = p_user_id;
end;
$$;

revoke execute on function public.create_room(int, public.question_category, jsonb, text[]) from anon, public;
revoke execute on function public.advance_card(uuid) from anon, public;
revoke execute on function public.toggle_favorite(uuid, text) from anon, public;
revoke execute on function public.end_session(uuid) from anon, public;
revoke execute on function public.delete_room(uuid) from anon, public;
revoke execute on function public.admin_delete_user(uuid) from anon, public;
