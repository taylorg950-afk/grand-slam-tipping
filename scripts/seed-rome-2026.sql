-- Full Italian Open 2026 bracket seed
-- Run this in Supabase SQL editor → SQL Editor → New query → paste → Run
-- Replaces any existing rome-2026 data.

DO $$
DECLARE
  tid  uuid;
  r64  uuid; r32  uuid; r16  uuid; rqf  uuid; rsf  uuid; rf   uuid;
BEGIN

-- ── Clean up existing rome-2026 ─────────────────────────────────────────────
DELETE FROM tips
WHERE match_id IN (
  SELECT m.id FROM matches m
  JOIN rounds r ON m.round_id = r.id
  JOIN tournaments t ON r.tournament_id = t.id
  WHERE t.slug = 'rome-2026'
);
DELETE FROM tiebreakers
WHERE tournament_id IN (SELECT id FROM tournaments WHERE slug = 'rome-2026');
DELETE FROM matches
WHERE round_id IN (
  SELECT r.id FROM rounds r
  JOIN tournaments t ON r.tournament_id = t.id
  WHERE t.slug = 'rome-2026'
);
DELETE FROM rounds
WHERE tournament_id IN (SELECT id FROM tournaments WHERE slug = 'rome-2026');
DELETE FROM tournaments WHERE slug = 'rome-2026';

-- ── Tournament ───────────────────────────────────────────────────────────────
INSERT INTO tournaments (name, slug, start_date, end_date, is_active)
VALUES ('Italian Open 2026', 'rome-2026', '2026-05-07', '2026-05-18', true)
RETURNING id INTO tid;

-- ── Rounds ───────────────────────────────────────────────────────────────────
INSERT INTO rounds (tournament_id, name, points_per_correct_tip, sort_order)
VALUES (tid, 'R64', 2, 1) RETURNING id INTO r64;

INSERT INTO rounds (tournament_id, name, points_per_correct_tip, sort_order)
VALUES (tid, 'R32', 4, 2) RETURNING id INTO r32;

INSERT INTO rounds (tournament_id, name, points_per_correct_tip, sort_order)
VALUES (tid, 'R16', 8, 3) RETURNING id INTO r16;

INSERT INTO rounds (tournament_id, name, points_per_correct_tip, sort_order)
VALUES (tid, 'QF', 16, 4) RETURNING id INTO rqf;

INSERT INTO rounds (tournament_id, name, points_per_correct_tip, sort_order)
VALUES (tid, 'SF', 32, 5) RETURNING id INTO rsf;

INSERT INTO rounds (tournament_id, name, points_per_correct_tip, sort_order)
VALUES (tid, 'F', 64, 6) RETURNING id INTO rf;

-- ── R64 (32 matches, bracket positions 0-31 via created_at order) ─────────────
-- Matches are inserted top-to-bottom in bracket order.
-- Q1 = Sinner's quarter (pos 0-7), Q2 = Zverev's (8-15),
-- Q3 = Djokovic's (16-23), Q4 = Alcaraz's (24-31)
INSERT INTO matches (round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at) VALUES
  -- Q1 pos 0-7
  (r64,'Jannik Sinner',       'Jan-Lennard Struff',      '2026-05-07 10:00+00','player1','mens', NOW()-interval'72h'+interval'0s'),
  (r64,'Jiri Lehecka',        'Sebastian Baez',          '2026-05-07 10:30+00','player1','mens', NOW()-interval'72h'+interval'1s'),
  (r64,'Cameron Norrie',      'Quentin Halys',           '2026-05-07 11:00+00','player1','mens', NOW()-interval'72h'+interval'2s'),
  (r64,'Tomas Martin Etcheverry','Alexei Popyrin',       '2026-05-07 11:30+00','player1','mens', NOW()-interval'72h'+interval'3s'),
  (r64,'Alex De Minaur',      'Oscar Otte',              '2026-05-07 13:00+00','player1','mens', NOW()-interval'72h'+interval'4s'),
  (r64,'Francisco Cerundolo', 'Yoshihito Nishioka',      '2026-05-07 13:30+00','player1','mens', NOW()-interval'72h'+interval'5s'),
  (r64,'Hubert Hurkacz',      'Giulio Zeppieri',         '2026-05-07 14:00+00','player1','mens', NOW()-interval'72h'+interval'6s'),
  (r64,'Andrey Rublev',       'Marton Fucsovics',        '2026-05-07 14:30+00','player1','mens', NOW()-interval'72h'+interval'7s'),
  -- Q2 pos 8-15
  (r64,'Felix Auger-Aliassime','Richard Gasquet',        '2026-05-07 15:00+00','player1','mens', NOW()-interval'72h'+interval'8s'),
  (r64,'Arthur Fils',         'Joao Sousa',              '2026-05-07 15:30+00','player1','mens', NOW()-interval'72h'+interval'9s'),
  (r64,'Grigor Dimitrov',     'Denis Shapovalov',        '2026-05-08 10:00+00','player1','mens', NOW()-interval'72h'+interval'10s'),
  (r64,'Karen Khachanov',     'Tallon Griekspoor',       '2026-05-08 10:30+00','player1','mens', NOW()-interval'72h'+interval'11s'),
  (r64,'Casper Ruud',         'Jaume Munar',             '2026-05-08 11:00+00','player1','mens', NOW()-interval'72h'+interval'12s'),
  (r64,'Albert Ramos-Vinolas','Constant Lestienne',      '2026-05-08 11:30+00','player1','mens', NOW()-interval'72h'+interval'13s'),
  (r64,'Matteo Berrettini',   'Hugo Gaston',             '2026-05-08 13:00+00','player1','mens', NOW()-interval'72h'+interval'14s'),
  (r64,'Alexander Zverev',    'Cristian Garin',          '2026-05-08 13:30+00','player1','mens', NOW()-interval'72h'+interval'15s'),
  -- Q3 pos 16-23
  (r64,'Novak Djokovic',      'Laslo Djere',             '2026-05-07 16:00+00','player1','mens', NOW()-interval'72h'+interval'16s'),
  (r64,'Frances Tiafoe',      'Emil Ruusuvuori',         '2026-05-07 16:30+00','player1','mens', NOW()-interval'72h'+interval'17s'),
  (r64,'Tommy Paul',          'Stan Wawrinka',           '2026-05-08 14:00+00','player1','mens', NOW()-interval'72h'+interval'18s'),
  (r64,'Daniil Medvedev',     'Sebastian Korda',         '2026-05-08 14:30+00','player1','mens', NOW()-interval'72h'+interval'19s'),
  (r64,'Taylor Fritz',        'Gregoire Barrere',        '2026-05-08 15:00+00','player1','mens', NOW()-interval'72h'+interval'20s'),
  (r64,'Holger Rune',         'Borna Coric',             '2026-05-08 15:30+00','player1','mens', NOW()-interval'72h'+interval'21s'),
  (r64,'Ugo Humbert',         'Fabio Fognini',           '2026-05-08 16:00+00','player1','mens', NOW()-interval'72h'+interval'22s'),
  (r64,'Stefanos Tsitsipas',  'Jordan Thompson',         '2026-05-08 16:30+00','player1','mens', NOW()-interval'72h'+interval'23s'),
  -- Q4 pos 24-31
  (r64,'Matteo Arnaldi',      'Pedro Martinez',          '2026-05-07 17:00+00','player1','mens', NOW()-interval'72h'+interval'24s'),
  (r64,'Zizou Bergs',         'Marc-Andrea Huesler',     '2026-05-07 17:30+00','player1','mens', NOW()-interval'72h'+interval'25s'),
  (r64,'Lorenzo Musetti',     'Christopher Eubanks',     '2026-05-08 17:00+00','player1','mens', NOW()-interval'72h'+interval'26s'),
  (r64,'Jack Draper',         'Ben Shelton',             '2026-05-08 17:30+00','player1','mens', NOW()-interval'72h'+interval'27s'),
  (r64,'Alejandro Davidovich Fokina','Marcos Giron',     '2026-05-08 18:00+00','player1','mens', NOW()-interval'72h'+interval'28s'),
  (r64,'Roman Safiullin',     'Mackenzie McDonald',      '2026-05-08 18:30+00','player1','mens', NOW()-interval'72h'+interval'29s'),
  (r64,'Alexander Bublik',    'Facundo Diaz Acosta',     '2026-05-09 10:00+00','player1','mens', NOW()-interval'72h'+interval'30s'),
  (r64,'Carlos Alcaraz',      'Nicolas Jarry',           '2026-05-09 10:30+00','player1','mens', NOW()-interval'72h'+interval'31s');

-- ── R32 (16 matches, bracket positions 0-15) ──────────────────────────────────
-- player1 = winner of R64[2*pos], player2 = winner of R64[2*pos+1]
INSERT INTO matches (round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at) VALUES
  -- Q1
  (r32,'Jannik Sinner',       'Jiri Lehecka',            '2026-05-08 10:00+00','player1','mens', NOW()-interval'48h'+interval'0s'),
  (r32,'Cameron Norrie',      'Tomas Martin Etcheverry', '2026-05-08 10:30+00','player2','mens', NOW()-interval'48h'+interval'1s'),
  (r32,'Alex De Minaur',      'Francisco Cerundolo',     '2026-05-08 11:00+00','player1','mens', NOW()-interval'48h'+interval'2s'),
  (r32,'Hubert Hurkacz',      'Andrey Rublev',           '2026-05-08 11:30+00','player2','mens', NOW()-interval'48h'+interval'3s'),
  -- Q2
  (r32,'Felix Auger-Aliassime','Arthur Fils',            '2026-05-08 13:00+00','player1','mens', NOW()-interval'48h'+interval'4s'),
  (r32,'Grigor Dimitrov',     'Karen Khachanov',         '2026-05-08 13:30+00','player1','mens', NOW()-interval'48h'+interval'5s'),
  (r32,'Casper Ruud',         'Albert Ramos-Vinolas',    '2026-05-08 14:00+00','player1','mens', NOW()-interval'48h'+interval'6s'),
  (r32,'Matteo Berrettini',   'Alexander Zverev',        '2026-05-08 14:30+00','player2','mens', NOW()-interval'48h'+interval'7s'),
  -- Q3
  (r32,'Novak Djokovic',      'Frances Tiafoe',          '2026-05-09 10:00+00','player1','mens', NOW()-interval'48h'+interval'8s'),
  (r32,'Tommy Paul',          'Daniil Medvedev',         '2026-05-09 10:30+00','player2','mens', NOW()-interval'48h'+interval'9s'),
  (r32,'Taylor Fritz',        'Holger Rune',             '2026-05-09 11:00+00','player1','mens', NOW()-interval'48h'+interval'10s'),
  (r32,'Ugo Humbert',         'Stefanos Tsitsipas',      '2026-05-09 11:30+00','player2','mens', NOW()-interval'48h'+interval'11s'),
  -- Q4
  (r32,'Matteo Arnaldi',      'Zizou Bergs',             '2026-05-09 13:00+00','player1','mens', NOW()-interval'48h'+interval'12s'),
  (r32,'Lorenzo Musetti',     'Jack Draper',             '2026-05-09 13:30+00','player1','mens', NOW()-interval'48h'+interval'13s'),
  (r32,'Alejandro Davidovich Fokina','Roman Safiullin',  '2026-05-09 14:00+00','player1','mens', NOW()-interval'48h'+interval'14s'),
  (r32,'Alexander Bublik',    'Carlos Alcaraz',          '2026-05-09 14:30+00','player2','mens', NOW()-interval'48h'+interval'15s');

-- ── R16 (8 matches, bracket positions 0-7) ────────────────────────────────────
-- player1 = winner of R32[2*pos], player2 = winner of R32[2*pos+1]
INSERT INTO matches (round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at) VALUES
  (r16,'Jannik Sinner',       'Tomas Martin Etcheverry', '2026-05-09 16:00+00','player1','mens', NOW()-interval'24h'+interval'0s'),
  (r16,'Alex De Minaur',      'Andrey Rublev',           '2026-05-09 17:00+00','player2','mens', NOW()-interval'24h'+interval'1s'),
  (r16,'Felix Auger-Aliassime','Grigor Dimitrov',        '2026-05-09 18:00+00','player2','mens', NOW()-interval'24h'+interval'2s'),
  (r16,'Casper Ruud',         'Alexander Zverev',        '2026-05-10 06:00+00','player2','mens', NOW()-interval'24h'+interval'3s'),
  (r16,'Novak Djokovic',      'Daniil Medvedev',         '2026-05-10 07:00+00','player1','mens', NOW()-interval'24h'+interval'4s'),
  (r16,'Taylor Fritz',        'Stefanos Tsitsipas',      '2026-05-10 08:00+00','player2','mens', NOW()-interval'24h'+interval'5s'),
  (r16,'Matteo Arnaldi',      'Lorenzo Musetti',         '2026-05-10 09:00+00','player2','mens', NOW()-interval'24h'+interval'6s'),
  (r16,'Alejandro Davidovich Fokina','Carlos Alcaraz',   '2026-05-10 10:00+00','player2','mens', NOW()-interval'24h'+interval'7s');

-- ── QF (4 matches, bracket positions 0-3) ─────────────────────────────────────
-- player1 = winner of R16[2*pos], player2 = winner of R16[2*pos+1]
-- pos 0-1: locked (past), no winner = in progress
-- pos 2-3: not locked (future)
INSERT INTO matches (round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at) VALUES
  (rqf,'Jannik Sinner',       'Andrey Rublev',           '2026-05-10 10:00+00', NULL,'mens', NOW()-interval'2h'+interval'0s'),
  (rqf,'Grigor Dimitrov',     'Alexander Zverev',        '2026-05-10 14:00+00', NULL,'mens', NOW()-interval'2h'+interval'1s'),
  (rqf,'Novak Djokovic',      'Stefanos Tsitsipas',      '2026-05-11 10:00+00', NULL,'mens', NOW()-interval'2h'+interval'2s'),
  (rqf,'Lorenzo Musetti',     'Carlos Alcaraz',          '2026-05-11 14:00+00', NULL,'mens', NOW()-interval'2h'+interval'3s');

-- ── SF (2 matches) ────────────────────────────────────────────────────────────
INSERT INTO matches (round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at) VALUES
  (rsf,'TBD','TBD','2026-05-12 10:00+00', NULL,'mens', NOW()+interval'1h'+interval'0s'),
  (rsf,'TBD','TBD','2026-05-12 14:00+00', NULL,'mens', NOW()+interval'1h'+interval'1s');

-- ── F (1 match) ───────────────────────────────────────────────────────────────
INSERT INTO matches (round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at) VALUES
  (rf, 'TBD','TBD','2026-05-14 14:00+00', NULL,'mens', NOW()+interval'2h');

END $$;
