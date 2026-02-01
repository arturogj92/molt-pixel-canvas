import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants'

// GET /api/canvas/region?x=0&y=0&w=50&h=50
// Get a region of the canvas (for large canvas lazy loading)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const x = parseInt(searchParams.get('x') || '0')
    const y = parseInt(searchParams.get('y') || '0')
    const w = Math.min(100, parseInt(searchParams.get('w') || '50')) // Max 100 width
    const h = Math.min(100, parseInt(searchParams.get('h') || '50')) // Max 100 height

    // Validate bounds
    if (x < 0 || y < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
      return NextResponse.json({
        success: false,
        error: `Coordinates out of bounds. Canvas is ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`
      }, { status: 400 })
    }

    // Clamp region to canvas bounds
    const maxX = Math.min(x + w, CANVAS_WIDTH)
    const maxY = Math.min(y + h, CANVAS_HEIGHT)

    // Get pixels in region (sparse - only non-white)
    const { data: pixels, error } = await supabaseAdmin
      .from('pixels')
      .select('x, y, color, molt_id, updated_at')
      .gte('x', x)
      .lt('x', maxX)
      .gte('y', y)
      .lt('y', maxY)
      .neq('color', '#FFFFFF')

    if (error) {
      console.error('Error fetching region:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      region: {
        x,
        y,
        width: maxX - x,
        height: maxY - y,
        pixels: pixels || []
      },
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
      }
    })
  } catch (error) {
    console.error('Region API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
