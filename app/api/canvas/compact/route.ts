import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '@/lib/constants'

// Returns canvas as compact binary-like string
// Format: each pixel is "x,y,c;" where c is color index (0-15)
export async function GET() {
  try {
    const CHUNK_SIZE = 50000
    let offset = 0
    let hasMore = true
    
    // Build compact string
    let compact = ''
    const colorMap = new Map(COLORS.map((c, i) => [c, i]))
    
    while (hasMore) {
      const { data: pixels, error } = await supabaseAdmin
        .from('pixels')
        .select('x, y, color')
        .range(offset, offset + CHUNK_SIZE - 1)
      
      if (error || !pixels || pixels.length === 0) {
        hasMore = false
        break
      }

      for (const p of pixels) {
        const colorIdx = colorMap.get(p.color) ?? 0
        compact += `${p.x},${p.y},${colorIdx};`
      }

      offset += pixels.length
      if (pixels.length < CHUNK_SIZE) hasMore = false
      if (offset > 1100000) break
    }

    return new NextResponse(compact, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=5',
      }
    })
  } catch (error) {
    console.error('Compact canvas API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
