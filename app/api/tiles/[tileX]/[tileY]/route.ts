import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { COLORS } from '@/lib/constants'

const TILE_SIZE = 100

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tileX: string; tileY: string }> }
) {
  try {
    const { tileX, tileY } = await params
    const tx = parseInt(tileX)
    const ty = parseInt(tileY)
    
    if (isNaN(tx) || isNaN(ty) || tx < 0 || tx >= 10 || ty < 0 || ty >= 10) {
      return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 })
    }

    const startX = tx * TILE_SIZE
    const startY = ty * TILE_SIZE
    const endX = startX + TILE_SIZE - 1
    const endY = startY + TILE_SIZE - 1

    // Fetch all pixels for this tile (paginated in chunks of 1000)
    const allPixels: any[] = []
    let from = 0
    const CHUNK = 1000
    
    while (true) {
      const { data: pixels, error } = await supabaseAdmin
        .from('pixels')
        .select('x, y, color')
        .gte('x', startX)
        .lte('x', endX)
        .gte('y', startY)
        .lte('y', endY)
        .order('x', { ascending: true })
        .order('y', { ascending: true })
        .range(from, from + CHUNK - 1)

      if (error) {
        console.error('Tile fetch error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      if (!pixels || pixels.length === 0) break
      allPixels.push(...pixels)
      from += pixels.length
      if (pixels.length < CHUNK) break
    }

    // Convert to compact format with local coordinates
    const colorMap = new Map(COLORS.map((c, i) => [c, i]))
    let compact = ''
    
    for (const p of allPixels) {
      const localX = p.x - startX
      const localY = p.y - startY
      const colorIdx = colorMap.get(p.color) ?? 0
      compact += `${localX},${localY},${colorIdx};`
    }

    return new NextResponse(compact, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=5',
      }
    })
  } catch (error) {
    console.error('Tile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
