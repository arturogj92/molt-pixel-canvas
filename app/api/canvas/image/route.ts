import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '@/lib/constants'
import sharp from 'sharp'

// Convert hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [255, 255, 255]
}

export async function GET() {
  try {
    // Create raw pixel buffer (RGBA)
    const buffer = Buffer.alloc(CANVAS_WIDTH * CANVAS_HEIGHT * 3)
    
    // Fill with white
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = 255     // R
      buffer[i + 1] = 255 // G
      buffer[i + 2] = 255 // B
    }

    // Fetch all pixels in chunks
    const CHUNK_SIZE = 50000
    let offset = 0
    let hasMore = true
    
    while (hasMore) {
      const { data: pixels, error } = await supabaseAdmin
        .from('pixels')
        .select('x, y, color')
        .range(offset, offset + CHUNK_SIZE - 1)
      
      if (error) {
        console.error('Error fetching pixels:', error)
        break
      }
      
      if (!pixels || pixels.length === 0) {
        hasMore = false
        break
      }

      // Paint pixels into buffer
      for (const pixel of pixels) {
        const idx = (pixel.y * CANVAS_WIDTH + pixel.x) * 3
        const [r, g, b] = hexToRgb(pixel.color)
        buffer[idx] = r
        buffer[idx + 1] = g
        buffer[idx + 2] = b
      }

      offset += pixels.length
      if (pixels.length < CHUNK_SIZE) hasMore = false
      
      // Safety limit
      if (offset > 1100000) break
    }

    // Generate PNG using sharp
    const png = await sharp(buffer, {
      raw: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        channels: 3
      }
    })
    .png({ compressionLevel: 6 })
    .toBuffer()

    return new NextResponse(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=5', // Cache for 5 seconds
      }
    })
  } catch (error) {
    console.error('Canvas image API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
