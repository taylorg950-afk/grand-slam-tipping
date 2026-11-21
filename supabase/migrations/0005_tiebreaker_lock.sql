-- Tiebreaker lock, enforced in the database.
--
-- Until now the tiebreaker lock lived only in the app: the RLS policies let a
-- user insert or update their own row at any time, so a late save straight
-- through the API would have been accepted. This closes that.
--
-- The lock is the first serve of whichever singles final starts first, men's
-- or women's — any match in the tournament's 'F' round whose scheduled_start
-- has passed. Matches the app's rule in src/lib/tiebreaker-lock.ts.
--
-- Admin writes go through the service-role key, which bypasses RLS, so a
-- genuine correction after the lock is still possible.

create or replace function public.tiebreaker_open(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.matches m
    join public.rounds r on r.id = m.round_id
    where r.tournament_id = t_id
      and r.name = 'F'
      and m.scheduled_start <= now()
  );
$$;

drop policy if exists "Users can insert own tiebreaker" on public.tiebreakers;
drop policy if exists "Users can update own tiebreaker" on public.tiebreakers;

create policy "Users can insert own tiebreaker before the first final"
  on public.tiebreakers for insert
  to authenticated
  with check (user_id = auth.uid() and public.tiebreaker_open(tournament_id));

create policy "Users can update own tiebreaker before the first final"
  on public.tiebreakers for update
  to authenticated
  using (user_id = auth.uid() and public.tiebreaker_open(tournament_id))
  with check (user_id = auth.uid() and public.tiebreaker_open(tournament_id));
