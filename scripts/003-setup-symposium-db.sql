-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS student_performance CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- Create players table for the symposium event
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  college TEXT,
  department TEXT,
  year_of_study TEXT,
  contact_number TEXT,
  email TEXT,
  score INTEGER DEFAULT 0,
  round1_score INTEGER DEFAULT 0,
  round2_score INTEGER DEFAULT 0,
  round1_completed BOOLEAN DEFAULT FALSE,
  round2_enabled BOOLEAN DEFAULT FALSE,
  round2_completed BOOLEAN DEFAULT FALSE,
  tab_switch_count INTEGER DEFAULT 0,
  is_disqualified BOOLEAN DEFAULT FALSE,
  round1_answers JSONB DEFAULT '{}'::jsonb,
  start_time BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_score ON players(score DESC);
CREATE INDEX IF NOT EXISTS idx_players_disqualified ON players(is_disqualified);
CREATE INDEX IF NOT EXISTS idx_players_round1_completed ON players(round1_completed);
CREATE INDEX IF NOT EXISTS idx_players_round2_enabled ON players(round2_enabled);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON players;
DROP POLICY IF EXISTS "Allow public insert" ON players;
DROP POLICY IF EXISTS "Allow public update" ON players;
DROP POLICY IF EXISTS "Allow public delete" ON players;

-- Create policies for public access (for the symposium app)
CREATE POLICY "Allow public read access" ON players
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON players
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON players
  FOR DELETE USING (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_players_updated_at();
