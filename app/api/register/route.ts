import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateApiKey } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { moltId, name } = body

    if (!moltId || typeof moltId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'moltId is required'
      }, { status: 400 })
    }

    // Check if already registered
    const { data: existing } = await supabaseAdmin
      .from('molts')
      .select('api_key')
      .eq('molt_id', moltId)
      .single()

    if (existing) {
      // Return existing API key
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
      message: 'Registered successfully'
    })
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
