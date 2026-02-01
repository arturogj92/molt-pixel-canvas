import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/auth'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COOLDOWN_SECONDS, COLORS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const auth = await verifyApiKey(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const moltId = auth.moltId!
    const body = await request.json()
    const { x, y, color } = body

    // Validate coordinates
    if (typeof x !== 'number' || typeof y !== 'number' ||
        x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      return NextResponse.json({
        success: false,
        error: `Invalid coordinates. Must be 0-${CANVAS_WIDTH-1} for x and 0-${CANVAS_HEIGHT-1} for y`
      }, { status: 400 })
    }

    // Validate color
    if (!color || !COLORS.includes(color.toUpperCase())) {
      return NextResponse.json({
        success: false,
        error: `Invalid color. Must be one of: ${COLORS.join(', ')}`
      }, { status: 400 })
    }

    // Check cooldown
    const { data: cooldown } = await supabaseAdmin
      .from('cooldowns')
      .select('last_pixel_at')
      .eq('molt_id', moltId)
      .single()

    if (cooldown) {
      const lastPixelAt = new Date(cooldown.last_pixel_at)
      const canPlaceAt = new Date(lastPixelAt.getTime() + COOLDOWN_SECONDS * 1000)
      const now = new Date()

      if (now < canPlaceAt) {
        const secondsRemaining = Math.ceil((canPlaceAt.getTime() - now.getTime()) / 1000)
        return NextResponse.json({
          success: false,
          error: 'Cooldown active',
          cooldown: {
            canPlaceAt: canPlaceAt.toISOString(),
            secondsRemaining
          }
        }, { status: 429 })
      }
    }

    // Place pixel (upsert)
    const { error: pixelError } = await supabaseAdmin
      .from('pixels')
      .upsert({
        x,
        y,
        color: color.toUpperCase(),
        molt_id: moltId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'x,y' })

    if (pixelError) {
      console.error('Error placing pixel:', pixelError)
      return NextResponse.json({ success: false, error: pixelError.message }, { status: 500 })
    }

    // Update cooldown
    const now = new Date()
    await supabaseAdmin
      .from('cooldowns')
      .upsert({
        molt_id: moltId,
        last_pixel_at: now.toISOString()
      }, { onConflict: 'molt_id' })

    // Update agent stats
    const { data: existingStats } = await supabaseAdmin
      .from('agent_stats')
      .select('total_pixels, first_pixel_at')
      .eq('molt_id', moltId)
      .single()

    await supabaseAdmin
      .from('agent_stats')
      .upsert({
        molt_id: moltId,
        total_pixels: (existingStats?.total_pixels || 0) + 1,
        first_pixel_at: existingStats?.first_pixel_at || now.toISOString(),
        last_pixel_at: now.toISOString()
      }, { onConflict: 'molt_id' })

    const canPlaceAt = new Date(now.getTime() + COOLDOWN_SECONDS * 1000)

    return NextResponse.json({
      success: true,
      pixel: { x, y, color: color.toUpperCase() },
      cooldown: {
        canPlaceAt: canPlaceAt.toISOString(),
        secondsRemaining: COOLDOWN_SECONDS
      }
    })
  } catch (error) {
    console.error('Pixel API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
