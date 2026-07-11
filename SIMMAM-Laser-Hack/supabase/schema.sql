-- ============================================================
-- Astro Survivor — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── game_sessions ───────────────────────────────────────────
-- Server-authoritative game timing. Start and end times are
-- recorded by the server — the client never provides times.
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name      TEXT        NOT NULL,
  register_number  TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  house            TEXT        NOT NULL,
  start_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time         TIMESTAMPTZ,
  survival_time_ms INTEGER,                        -- computed server-side
  score            INTEGER,                        -- score at the end of the session
  high_score       INTEGER,                        -- the player's high score after this session
  is_new_record    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── runs (leaderboard entries) ──────────────────────────────
-- Only created when a game is completed. total_seconds is
-- computed from survival_time_ms — never trusted from client.
CREATE TABLE IF NOT EXISTS public.runs (
  id               SERIAL      PRIMARY KEY,
  player_name      TEXT        NOT NULL,
  register_number  TEXT        NOT NULL UNIQUE,
  email            TEXT        NOT NULL UNIQUE,
  house            TEXT        NOT NULL CHECK (house IN ('agniyas','dronas','marutas','rudras','suryas','vajras')),
  total_seconds    INTEGER     NOT NULL CHECK (total_seconds > 0),
  score            INTEGER     NOT NULL DEFAULT 0,
  session_id       UUID        REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_runs_score         ON public.runs(total_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_runs_house         ON public.runs(house);
CREATE INDEX IF NOT EXISTS idx_runs_player        ON public.runs(register_number);
CREATE INDEX IF NOT EXISTS idx_sessions_player    ON public.game_sessions(register_number);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON public.game_sessions(completed);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs          ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read leaderboard
CREATE POLICY "Public read runs" ON public.runs
  FOR SELECT USING (true);

-- Only service role can insert/update/delete (server does this)
CREATE POLICY "Service role only insert runs" ON public.runs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only update runs" ON public.runs
  FOR UPDATE USING (auth.role() = 'service_role');

-- game_sessions: only service role
CREATE POLICY "Service role read sessions" ON public.game_sessions
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role insert sessions" ON public.game_sessions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update sessions" ON public.game_sessions
  FOR UPDATE USING (auth.role() = 'service_role');

-- ─── Leaderboard view ────────────────────────────────────────
-- Convenience view for full leaderboard with rank
CREATE OR REPLACE VIEW public.leaderboard_ranked AS
  SELECT
    RANK() OVER (ORDER BY total_seconds ASC, created_at ASC) AS rank,
    player_name,
    register_number,
    house,
    total_seconds,
    created_at
  FROM public.runs
  ORDER BY rank;

-- ─── House leaderboard view ───────────────────────────────────
-- Best run per house (for house challenge feature)
CREATE OR REPLACE VIEW public.house_leaderboard AS
  SELECT DISTINCT ON (house)
    house,
    player_name,
    register_number,
    total_seconds,
    created_at
  FROM public.runs
  ORDER BY house, total_seconds ASC, created_at ASC;
