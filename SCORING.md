# Scoring Rules

Points per correct tip, by round. Stored as `points_per_correct_tip` on the `rounds` table — adjustable per-tournament via admin UI.

## Default Grand Slam preset

| Round | Players remaining | Matches | Points |
|-------|------------------|---------|--------|
| R64   | 64               | 32      | 2      |
| R32   | 32               | 16      | 4      |
| R16   | 16               | 8       | 8      |
| QF    | 8                | 4       | 16     |
| SF    | 4                | 2       | 32     |
| F     | 2                | 1       | 64     |

R1 (round of 128) is excluded — too many picks.

Scoring is computed dynamically from `tips` and `match_results`. Points are never stored as a denormalised column on tips.
