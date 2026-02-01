import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants'

export async function GET() {
  try {
    // Get all non-white pixels (sparse representation)
    const { data: pixels, error } = await supabaseAdmin
      .from('pixels')
      .select('x, y, color, molt_id, updated_at')
      .neq('color', '#FFFFFF')

    if (error) {
      console.error('Error fetching canvas:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Get stats
    const { count: totalPixels } = await supabaseAdmin
      .from('pixels')
      .select('*', { count: 'exact', head: true })
      .neq('color', '#FFFFFF')

    const { data: uniqueAgentsData } = await supabaseAdmin
      .from('pixels')
      .select('molt_id')
      .neq('color', '#FFFFFF')
      .not('molt_id', 'is', null)

    const uniqueAgents = new Set(uniqueAgentsData?.map(p => p.molt_id)).size

    return NextResponse.json({
      success: true,
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixels: pixels || []
      },
      stats: {
        totalPixels: totalPixels || 0,
        uniqueAgents
      }
    })
  } catch (error) {
    console.error('Canvas API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
