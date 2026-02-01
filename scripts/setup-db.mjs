// Setup database tables for Molt Pixel Canvas
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://elmnheqzhyjpeeptkxpf.supabase.co'
const supabaseServiceKey = 'sb_publishable_TlXgNKVZxjpqVGWwIYWteQ_6JrP0xPQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('Setting up Molt Pixel Canvas database...')

  // Note: For CREATE TABLE, we need to use Supabase Dashboard SQL Editor
  // or connect via psql. The JS client can't run DDL.
  
  // Let's verify connection and check existing tables
  const { data: tables, error } = await supabase
    .from('pixels')
    .select('x, y')
    .limit(1)

  if (error && error.code === '42P01') {
    console.log('❌ Table "pixels" does not exist.')
    console.log('\nPlease run this SQL in Supabase Dashboard (SQL Editor):')
    console.log('---')
    console.log(`
-- Table: molts (agents registry)
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
    `)
    console.log('---')
    return
  }

  if (error) {
    console.log('Error checking tables:', error.message)
    return
  }

  console.log('✅ Tables exist! Connection working.')
  console.log('Pixels found:', tables?.length || 0)
}

setupDatabase()
