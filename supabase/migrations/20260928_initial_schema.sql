-- Hackathon Platform Initial Schema
-- Includes tables, indexes, security views, and RLS policies

-- 1. Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  registration_token TEXT UNIQUE NOT NULL,
  registration_open BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  code VARCHAR(6) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Members
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_leader BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Rounds
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  "order" INT NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN ('quiz', 'build')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  "order" INT NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL,
  time_limit INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Question Runs
CREATE TABLE IF NOT EXISTS public.question_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- 9. Answers
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_run_id UUID REFERENCES public.question_runs(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  option INT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  points INT NOT NULL DEFAULT 0,
  CONSTRAINT unique_member_question_run UNIQUE (question_run_id, member_id)
);

-- 10. Leaderboard Cache
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('room', 'global')),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE,
  github_url TEXT,
  deploy_url TEXT,
  docs_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT unique_team_round_submission UNIQUE (team_id, round_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_event_id ON public.rooms(event_id);
CREATE INDEX IF NOT EXISTS idx_rooms_token ON public.rooms(registration_token);
CREATE INDEX IF NOT EXISTS idx_teams_room_id ON public.teams(room_id);
CREATE INDEX IF NOT EXISTS idx_teams_code ON public.teams(code);
CREATE INDEX IF NOT EXISTS idx_members_team_id ON public.members(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_member_id ON public.sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_rounds_event_id ON public.rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_questions_round_id ON public.questions(round_id);
CREATE INDEX IF NOT EXISTS idx_question_runs_question_id ON public.question_runs(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_run_id ON public.answers(question_run_id);
CREATE INDEX IF NOT EXISTS idx_answers_team_id ON public.answers(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON public.submissions(team_id);

-- Secure Public Questions View: Hides correct_index until the question_run is closed
CREATE OR REPLACE VIEW public.public_questions AS
SELECT 
  q.id,
  q.round_id,
  q."order",
  q.text,
  q.options,
  q.time_limit,
  CASE 
    WHEN qr.closed_at IS NOT NULL THEN q.correct_index 
    ELSE NULL 
  END AS correct_index,
  qr.id AS active_question_run_id,
  qr.started_at AS question_started_at,
  qr.closed_at AS question_closed_at
FROM public.questions q
LEFT JOIN public.question_runs qr ON qr.question_id = q.id;

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous/Participant Policies for Data Access
CREATE POLICY "Allow public read access to events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public read access to rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public read access to teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access to members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public read access to sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Allow public read access to question_runs" ON public.question_runs FOR SELECT USING (true);
CREATE POLICY "Allow public read access to leaderboard_cache" ON public.leaderboard_cache FOR SELECT USING (true);
CREATE POLICY "Allow public read access to answers" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Allow public insert answers" ON public.answers FOR INSERT WITH CHECK (true);

-- Submissions policies
CREATE POLICY "Allow public read access to submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert submissions" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update submissions" ON public.submissions FOR UPDATE USING (true);

-- Registrations policies
CREATE POLICY "Allow public insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update teams" ON public.teams FOR UPDATE USING (true);
CREATE POLICY "Allow public insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);
