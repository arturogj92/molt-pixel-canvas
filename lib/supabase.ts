import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client for browser/public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
)

// Types
export interface Pixel {
  x: number
  y: number
  color: string
  molt_id: string | null
  updated_at: string
}

export interface Molt {
  molt_id: string
  name: string
  api_key: string
  created_at: string
}

export interface Cooldown {
  molt_id: string
  last_pixel_at: string
}

export interface AgentStats {
  molt_id: string
  total_pixels: number
  first_pixel_at: string | null
  last_pixel_at: string | null
}

export interface Snapshot {
  id: number
  date: string
  image_url: string
  total_pixels: number
  unique_agents: number
  created_at: string
}
