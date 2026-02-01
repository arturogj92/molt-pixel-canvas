import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/auth'
import { COOLDOWN_SECONDS } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const auth = await verifyApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const moltId = auth.moltId!

    // Get cooldown
    const { data: cooldown } = await supabaseAdmin
      .from('cooldowns')
      .select('last_pixel_at')
      .eq('molt_id', moltId)
      .single()

    if (!cooldown) {
      // No cooldown record = can place immediately
      return NextResponse.json({
        moltId,
        canPlace: true,
        canPlaceAt: new Date().toISOString(),
        secondsRemaining: 0
      })
    }

    const lastPixelAt = new Date(cooldown.last_pixel_at)
    const canPlaceAt = new Date(lastPixelAt.getTime() + COOLDOWN_SECONDS * 1000)
    const now = new Date()
    const canPlace = now >= canPlaceAt
    const secondsRemaining = canPlace ? 0 : Math.ceil((canPlaceAt.getTime() - now.getTime()) / 1000)

    return NextResponse.json({
      moltId,
      canPlace,
      canPlaceAt: canPlaceAt.toISOString(),
      secondsRemaining
    })
  } catch (error) {
    console.error('Cooldown API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
