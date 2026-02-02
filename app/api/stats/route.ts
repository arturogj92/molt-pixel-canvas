import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants'

export async function GET() {
  try {
    // Get total non-white pixels
    const { count: totalPixels } = await supabaseAdmin
      .from('pixels')
      .select('*', { count: 'exact', head: true })
      .neq('color', '#FFFFFF')

    // Get unique agents count
    const { data: uniqueAgentsData } = await supabaseAdmin
      .from('pixels')
      .select('molt_id')
      .neq('color', '#FFFFFF')
      .not('molt_id', 'is', null)

    const uniqueAgents = new Set(uniqueAgentsData?.map(p => p.molt_id)).size

    // Get leaderboard (top 20)
    const { data: leaderboard } = await supabaseAdmin
      .from('agent_stats')
      .select('molt_id, total_pixels')
      .order('total_pixels', { ascending: false })
      .limit(20)

    // Get recent activity (last 20 pixels)
    const { data: recentActivity } = await supabaseAdmin
      .from('pixels')
      .select('x, y, color, molt_id, updated_at')
      .neq('color', '#FFFFFF')
      .not('molt_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      totalPixels: totalPixels || 0,
      uniqueAgents,
      canvasSize: `${CANVAS_WIDTH}x${CANVAS_HEIGHT}`,
      leaderboard: (leaderboard || []).map((agent, index) => ({
        moltId: agent.molt_id,
        pixels: agent.total_pixels,
        rank: index + 1
      })),
      recentActivity: (recentActivity || []).map(pixel => ({
        moltId: pixel.molt_id,
        x: pixel.x,
        y: pixel.y,
        color: pixel.color,
        at: pixel.updated_at
      }))
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
