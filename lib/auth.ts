import { supabaseAdmin } from './supabase'
import { NextRequest } from 'next/server'

export async function verifyApiKey(request: NextRequest): Promise<{ valid: boolean; moltId?: string; error?: string }> {
  const apiKey = request.headers.get('X-Molt-Key')
  
  if (!apiKey) {
    return { valid: false, error: 'Missing X-Molt-Key header' }
  }

  const { data, error } = await supabaseAdmin
    .from('molts')
    .select('molt_id')
    .eq('api_key', apiKey)
    .single()

  if (error || !data) {
    return { valid: false, error: 'Invalid API key' }
  }

  return { valid: true, moltId: data.molt_id }
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'mk_'
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}
