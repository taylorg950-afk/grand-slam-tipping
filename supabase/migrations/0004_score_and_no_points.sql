-- Match scoreline (free text, e.g. '6-4 3-6 7-6(5)' or 'w/o') shown on the bracket,
-- and a per-match "no points" flag for walkovers/retirements — the winner still
-- advances through the bracket, but no tipping points are awarded.

alter table public.matches add column score text;
alter table public.matches add column no_points boolean not null default false;
