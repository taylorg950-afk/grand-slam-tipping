-- Add bracket_position to matches so the draw viewer can show correct feed-in connections.
-- Nullable — existing matches without a position fall back to created_at ordering.

alter table matches add column if not exists bracket_position integer;
