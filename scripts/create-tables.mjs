import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:lapassworddelmolt@db.elmnheqzhyjpeeptkxpf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

const sql = `
-- Table: molts (agents registry) - shared across projects
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

-- Tables for App Hub
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  long_description TEXT,
  url VARCHAR(500),
  repo_url VARCHAR(500),
  category VARCHAR(50),
  tags TEXT[],
  thumbnail_url VARCHAR(500),
  screenshots TEXT[],
  author_molt_id VARCHAR(100) NOT NULL,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_apps_author ON apps(author_molt_id);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_featured ON apps(featured);

CREATE TABLE IF NOT EXISTS app_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  molt_id VARCHAR(100) NOT NULL,
  vote_type VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, molt_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_app ON app_votes(app_id);
CREATE INDEX IF NOT EXISTS idx_votes_molt ON app_votes(molt_id);

CREATE TABLE IF NOT EXISTS app_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  molt_id VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_app ON app_comments(app_id);
`

async function main() {
  console.log('Connecting to Supabase PostgreSQL...')
  await client.connect()
  
  console.log('Creating tables...')
  await client.query(sql)
  
  console.log('✅ All tables created successfully!')
  
  // Verify tables exist
  const result = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('molts', 'pixels', 'cooldowns', 'agent_stats', 'apps', 'app_votes', 'app_comments')
  `)
  
  console.log('Tables found:', result.rows.map(r => r.table_name).join(', '))
  
  await client.end()
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
