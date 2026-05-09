-- ============================================================
-- Grand Slam Tipping — initial schema
-- ============================================================

-- ------------------------------------------------------------
-- 1. User profiles (extends auth.users)
-- ------------------------------------------------------------
create table public.users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  display_name text       not null,
  is_admin    boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Auto-create profile on magic-link sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. Tournaments
-- ------------------------------------------------------------
create table public.tournaments (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  start_date  date        not null,
  end_date    date        not null,
  is_active   boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Enforce only one active tournament at a time at DB level
create unique index tournaments_one_active
  on public.tournaments (is_active)
  where is_active = true;

-- ------------------------------------------------------------
-- 3. Rounds
-- ------------------------------------------------------------
create table public.rounds (
  id                     uuid        primary key default gen_random_uuid(),
  tournament_id          uuid        not null references public.tournaments(id) on delete cascade,
  name                   text        not null,  -- 'R64', 'R32', 'R16', 'QF', 'SF', 'F'
  points_per_correct_tip int         not null,
  sort_order             int         not null,
  created_at             timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. Matches
-- ------------------------------------------------------------
create table public.matches (
  id               uuid        primary key default gen_random_uuid(),
  round_id         uuid        not null references public.rounds(id) on delete cascade,
  player1_name     text        not null,
  player2_name     text        not null,
  scheduled_start  timestamptz not null,  -- tips lock at this time
  winner           text        check (winner in ('player1', 'player2')),
  draw             text        not null check (draw in ('mens', 'womens')),
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. Tips
-- ------------------------------------------------------------
create table public.tips (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.users(id) on delete cascade,
  match_id         uuid        not null references public.matches(id) on delete cascade,
  predicted_winner text        not null check (predicted_winner in ('player1', 'player2')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, match_id)
);

-- ------------------------------------------------------------
-- 6. Tiebreakers
-- ------------------------------------------------------------
create table public.tiebreakers (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references public.users(id) on delete cascade,
  tournament_id           uuid        not null references public.tournaments(id) on delete cascade,
  mens_final_total_games  int,
  womens_final_total_games int,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id, tournament_id)
);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tips_updated_at
  before update on public.tips
  for each row execute procedure public.handle_updated_at();

create trigger tiebreakers_updated_at
  before update on public.tiebreakers
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users        enable row level security;
alter table public.tournaments  enable row level security;
alter table public.rounds       enable row level security;
alter table public.matches      enable row level security;
alter table public.tips         enable row level security;
alter table public.tiebreakers  enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  );
$$;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
create policy "Authenticated users can read profiles"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id);

-- ------------------------------------------------------------
-- tournaments
-- ------------------------------------------------------------
create policy "Authenticated users can read tournaments"
  on public.tournaments for select
  to authenticated
  using (true);

create policy "Admin can write tournaments"
  on public.tournaments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- rounds
-- ------------------------------------------------------------
create policy "Authenticated users can read rounds"
  on public.rounds for select
  to authenticated
  using (true);

create policy "Admin can write rounds"
  on public.rounds for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- matches
-- ------------------------------------------------------------
create policy "Authenticated users can read matches"
  on public.matches for select
  to authenticated
  using (true);

create policy "Admin can write matches"
  on public.matches for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- tips
-- ------------------------------------------------------------

-- Users always see their own tips
create policy "Users can read own tips"
  on public.tips for select
  to authenticated
  using (user_id = auth.uid());

-- Tips for locked matches become visible to all (no copying before lock)
create policy "Users can read tips for locked matches"
  on public.tips for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.scheduled_start <= now()
    )
  );

-- Admin sees everything
create policy "Admin can read all tips"
  on public.tips for select
  to authenticated
  using (public.is_admin());

-- Insert: own tip only, match must not be locked
create policy "Users can insert tips before lock"
  on public.tips for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.scheduled_start > now()
    )
  );

-- Update: own tip only, match must not be locked
create policy "Users can update tips before lock"
  on public.tips for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.scheduled_start > now()
    )
  );

-- ------------------------------------------------------------
-- tiebreakers
-- ------------------------------------------------------------
create policy "Users can read own tiebreakers"
  on public.tiebreakers for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admin can read all tiebreakers"
  on public.tiebreakers for select
  to authenticated
  using (public.is_admin());

create policy "Users can insert own tiebreaker"
  on public.tiebreakers for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own tiebreaker"
  on public.tiebreakers for update
  to authenticated
  using (user_id = auth.uid());
