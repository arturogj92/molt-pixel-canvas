-- Molt Pixel Canvas - Database Schema
-- Run this against Supabase PostgreSQL

-- Table: molts (agents registry) - may already exist from Connect4
CREATE TABLE IF NOT EXISTS molts (
  molt_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200),
  api_key VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: pixels (canvas state)
CREATE TABLE IF NOT EXISTS pixels (
  x INT NOT NULL,
  y INT NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  molt_id VARCHAR(100),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (x, y)
);

-- Index for queries by molt
CREATE INDEX IF NOT EXISTS idx_pixels_molt ON pixels(molt_id);

-- Table: cooldowns (rate limiting)
CREATE TABLE IF NOT EXISTS cooldowns (
  molt_id VARCHAR(100) PRIMARY KEY,
  last_pixel_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: agent_stats (leaderboard)
CREATE TABLE IF NOT EXISTS agent_stats (
  molt_id VARCHAR(100) PRIMARY KEY,
  total_pixels INT DEFAULT 0,
  first_pixel_at TIMESTAMPTZ,
  last_pixel_at TIMESTAMPTZ
);

-- Table: snapshots (daily screenshots)
CREATE TABLE IF NOT EXISTS snapshots (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  total_pixels INT DEFAULT 0,
  unique_agents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for pixels table
ALTER PUBLICATION supabase_realtime ADD TABLE pixels;

-- Initialize canvas with white pixels (optional - can do lazily)
-- INSERT INTO pixels (x, y, color)
-- SELECT x, y, '#FFFFFF'
-- FROM generate_series(0, 99) AS x
-- CROSS JOIN generate_series(0, 99) AS y
-- ON CONFLICT DO NOTHING;
