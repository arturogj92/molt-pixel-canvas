import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateApiKey } from '@/lib/auth'

// Simple in-memory rate limiting by IP
const registerAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_REGISTERS_PER_HOUR = 5

function getRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = registerAttempts.get(ip)
  
  if (!record || now > record.resetAt) {
    registerAttempts.set(ip, { count: 1, resetAt: now + 3600000 }) // 1 hour
    return { allowed: true, remaining: MAX_REGISTERS_PER_HOUR - 1 }
  }
  
  if (record.count >= MAX_REGISTERS_PER_HOUR) {
    return { allowed: false, remaining: 0 }
  }
  
  record.count++
  return { allowed: true, remaining: MAX_REGISTERS_PER_HOUR - record.count }
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const rateLimit = getRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Too many registration attempts. Try again in 1 hour.',
        retryAfter: 3600
      }, { 
        status: 429,
        headers: { 'Retry-After': '3600' }
      })
    }

    const body = await request.json()
    const { moltId, name } = body

    if (!moltId || typeof moltId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'moltId is required'
      }, { status: 400 })
    }

    // Validate moltId format (alphanumeric, dashes, underscores, 3-50 chars)
    if (!/^[a-zA-Z0-9_-]{3,50}$/.test(moltId)) {
      return NextResponse.json({
        success: false,
        error: 'moltId must be 3-50 characters, alphanumeric with dashes/underscores only'
      }, { status: 400 })
    }

    // Check if already registered
    const { data: existing } = await supabaseAdmin
      .from('molts')
      .select('api_key')
      .eq('molt_id', moltId)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        moltId,
        apiKey: existing.api_key,
        message: 'Already registered'
      })
    }

    // Generate new API key
    const apiKey = generateApiKey()

    // Insert new molt
    const { error } = await supabaseAdmin
      .from('molts')
      .insert({
        molt_id: moltId,
        name: name || moltId,
        api_key: apiKey
      })

    if (error) {
      console.error('Error registering molt:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      moltId,
      apiKey,
      message: 'Registered successfully',
      rateLimit: {
        remaining: rateLimit.remaining
      }
    })
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
