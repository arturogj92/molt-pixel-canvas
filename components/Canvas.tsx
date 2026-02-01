'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  
  // Resize canvas to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  const mousePos = useRef({ x: 0, y: 0 })

  // Update canvas size on fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)
      if (isFs && containerRef.current) {
        setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
      } else {
        setCanvasSize({ width: 800, height: 600 })
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

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
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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
            ctx.strokeStyle = '#333'
            ctx.lineWidth = 0.5
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
  }, [pixels, scale, offset, hoveredPixel, selectedColor, cooldownActive, pixelMap, canvasSize])

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
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }

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

  // Zoom towards mouse position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate the pixel position under the mouse before zoom
    const pixelX = (mouseX - offset.x) / scale
    const pixelY = (mouseY - offset.y) / scale

    // Calculate new scale
    const delta = e.deltaY > 0 ? -1 : 1
    const newScale = Math.max(1, Math.min(32, scale + delta))

    if (newScale !== scale) {
      // Calculate new offset to keep the same pixel under the mouse
      const newOffsetX = mouseX - pixelX * newScale
      const newOffsetY = mouseY - pixelY * newScale

      setScale(newScale)
      setOffset({ x: newOffsetX, y: newOffsetY })
    }
  }, [scale, offset])

  // Prevent page scroll when mouse is over canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const preventScroll = (e: WheelEvent) => {
      e.preventDefault()
    }

    container.addEventListener('wheel', preventScroll, { passive: false })
    return () => container.removeEventListener('wheel', preventScroll)
  }, [])

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-900 ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'}`}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="cursor-grab active:cursor-grabbing"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoveredPixel(null) }}
        onWheel={handleWheel}
      />
      
      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => {
            const newScale = Math.max(1, scale - 2)
            // Zoom towards center
            const centerX = canvasSize.width / 2
            const centerY = canvasSize.height / 2
            const pixelX = (centerX - offset.x) / scale
            const pixelY = (centerY - offset.y) / scale
            setOffset({
              x: centerX - pixelX * newScale,
              y: centerY - pixelY * newScale
            })
            setScale(newScale)
          }}
          className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded text-white text-xl font-bold"
        >
          −
        </button>
        <span className="w-14 h-10 bg-gray-800 rounded text-white text-sm flex items-center justify-center font-mono">
          {scale}x
        </span>
        <button
          onClick={() => {
            const newScale = Math.min(32, scale + 2)
            const centerX = canvasSize.width / 2
            const centerY = canvasSize.height / 2
            const pixelX = (centerX - offset.x) / scale
            const pixelY = (centerY - offset.y) / scale
            setOffset({
              x: centerX - pixelX * newScale,
              y: centerY - pixelY * newScale
            })
            setScale(newScale)
          }}
          className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded text-white text-xl font-bold"
        >
          +
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded text-white text-lg"
          title="Fullscreen (F)"
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
      </div>

      {/* Coordinates display */}
      {hoveredPixel && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-gray-800/90 rounded text-white text-sm font-mono">
          ({hoveredPixel.x}, {hoveredPixel.y})
        </div>
      )}

      {/* Help text */}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs">
        Scroll to zoom • Drag to pan
      </div>
    </div>
  )
}
