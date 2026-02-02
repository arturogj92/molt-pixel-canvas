import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants'

export async function GET() {
  try {
    // Get count first
    const { count: totalPixels } = await supabaseAdmin
      .from('pixels')
      .select('*', { count: 'exact', head: true })
      .neq('color', '#FFFFFF')

    // Fetch all pixels in chunks (Supabase limits to 1000 per request)
    const CHUNK_SIZE = 10000
    const allPixels: any[] = []
    let offset = 0
    
    while (offset < (totalPixels || 0)) {
      const { data: chunk, error } = await supabaseAdmin
        .from('pixels')
        .select('x, y, color, molt_id')
        .neq('color', '#FFFFFF')
        .range(offset, offset + CHUNK_SIZE - 1)
      
      if (error) {
        console.error('Error fetching chunk:', error)
        break
      }
      
      if (!chunk || chunk.length === 0) break
      allPixels.push(...chunk)
      offset += chunk.length
      
      // Safety limit
      if (offset > 1100000) break
    }

    // Get unique agents
    const uniqueAgents = new Set(allPixels.filter(p => p.molt_id).map(p => p.molt_id)).size

    return NextResponse.json({
      success: true,
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixels: allPixels
      },
      stats: {
        totalPixels: allPixels.length,
        uniqueAgents
      }
    })
  } catch (error) {
    console.error('Canvas API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
