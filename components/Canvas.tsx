'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '@/lib/constants'

interface Pixel {
  x: number
  y: number
  color: string
  molt_id: string | null
}

interface CanvasProps {
  pixels: Pixel[]
  selectedColor: string
  onPixelClick: (x: number, y: number) => void
  cooldownActive: boolean
}

export default function Canvas({ pixels, selectedColor, onPixelClick, cooldownActive }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(4)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null)

  // Create pixel map for quick lookup
  const pixelMap = useCallback(() => {
    const map = new Map<string, string>()
    pixels.forEach(p => map.set(`${p.x},${p.y}`, p.color))
    return map
  }, [pixels])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const map = pixelMap()
    const pixelSize = scale

    // Clear canvas
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid background
    ctx.strokeStyle = '#E5E5E5'
    ctx.lineWidth = 0.5

    // Draw pixels
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        const color = map.get(`${x},${y}`) || '#FFFFFF'
        const drawX = x * pixelSize + offset.x
        const drawY = y * pixelSize + offset.y

        // Only draw if visible
        if (drawX + pixelSize >= 0 && drawX < canvas.width &&
            drawY + pixelSize >= 0 && drawY < canvas.height) {
          ctx.fillStyle = color
          ctx.fillRect(drawX, drawY, pixelSize, pixelSize)

          // Draw grid lines at higher zoom levels
          if (scale >= 8) {
            ctx.strokeRect(drawX, drawY, pixelSize, pixelSize)
          }
        }
      }
    }

    // Draw hover indicator
    if (hoveredPixel && !cooldownActive) {
      const hx = hoveredPixel.x * pixelSize + offset.x
      const hy = hoveredPixel.y * pixelSize + offset.y
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = 2
      ctx.strokeRect(hx, hy, pixelSize, pixelSize)
      ctx.fillStyle = selectedColor + '80'
      ctx.fillRect(hx, hy, pixelSize, pixelSize)
    }
  }, [pixels, scale, offset, hoveredPixel, selectedColor, cooldownActive, pixelMap])

  // Handle mouse events
  const getPixelCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left - offset.x) / scale)
    const y = Math.floor((e.clientY - rect.top - offset.y) / scale)

    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
      return { x, y }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    } else {
      setHoveredPixel(getPixelCoords(e))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (cooldownActive) return
    const coords = getPixelCoords(e)
    if (coords) {
      onPixelClick(coords.x, coords.y)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -1 : 1
    setScale(prev => Math.max(2, Math.min(32, prev + delta)))
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] overflow-hidden bg-gray-900 rounded-lg border border-gray-700"
      onContextMenu={e => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="cursor-crosshair"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoveredPixel(null) }}
        onWheel={handleWheel}
      />
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScale(prev => Math.max(2, prev - 2))}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded text-white text-xl"
        >
          -
        </button>
        <span className="w-12 h-8 bg-gray-800 rounded text-white text-sm flex items-center justify-center">
          {scale}x
        </span>
        <button
          onClick={() => setScale(prev => Math.min(32, prev + 2))}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded text-white text-xl"
        >
          +
        </button>
      </div>

      {/* Coordinates display */}
      {hoveredPixel && (
        <div className="absolute top-4 left-4 px-2 py-1 bg-gray-800 rounded text-white text-sm">
          ({hoveredPixel.x}, {hoveredPixel.y})
        </div>
      )}
    </div>
  )
}
