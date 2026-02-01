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
  const [scale, setScale] = useState(2)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 })
  const [initialized, setInitialized] = useState(false)
  
  // Resize canvas to fit container and center on load
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = rect.width || window.innerWidth
        const newHeight = rect.height || window.innerHeight
        setCanvasSize({ width: newWidth, height: newHeight })
        
        // Center canvas on first load
        if (!initialized) {
          const centerX = CANVAS_WIDTH / 2
          const centerY = CANVAS_HEIGHT / 2
          // Start at scale 2 minimum for visibility
          const initialScale = Math.max(2, Math.floor(Math.min(newWidth, newHeight) / CANVAS_WIDTH * 2))
          setScale(initialScale)
          setOffset({
            x: newWidth / 2 - centerX * initialScale,
            y: newHeight / 2 - centerY * initialScale
          })
          setInitialized(true)
        }
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [initialized])

  // Update canvas size on fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)
      if (isFs) {
        setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
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

  // Get pixel coords from event
  const getPixelCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((clientX - rect.left - offset.x) / scale)
    const y = Math.floor((clientY - rect.top - offset.y) / scale)

    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
      return { x, y }
    }
    return null
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    } else {
      setHoveredPixel(getPixelCoords(e.clientX, e.clientY))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch events for mobile
  const lastTouchRef = useRef<{ x: number; y: number; dist?: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
      setIsDragging(true)
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y })
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.hypot(dx, dy)
      }
    }
    e.preventDefault()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      setOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      })
    } else if (e.touches.length === 2 && lastTouchRef.current?.dist) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const newDist = Math.hypot(dx, dy)
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const touchX = centerX - rect.left
        const touchY = centerY - rect.top
        
        // Calculate pixel position before zoom
        const pixelX = (touchX - offset.x) / scale
        const pixelY = (touchY - offset.y) / scale

        // Calculate new scale based on pinch delta (more sensitive)
        const zoomFactor = newDist / lastTouchRef.current.dist
        // Use floor/ceil based on direction for more responsive feel
        let newScale: number
        if (zoomFactor > 1) {
          newScale = Math.min(32, Math.ceil(scale * zoomFactor))
        } else {
          newScale = Math.max(2, Math.floor(scale * zoomFactor))
        }

        if (newScale !== scale) {
          // Recalculate offset to keep same point under fingers
          const newOffsetX = touchX - pixelX * newScale
          const newOffsetY = touchY - pixelY * newScale
          
          setScale(newScale)
          setOffset({ x: newOffsetX, y: newOffsetY })
        }
      }

      lastTouchRef.current = { x: centerX, y: centerY, dist: newDist }
    }
    e.preventDefault()
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    lastTouchRef.current = null
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

    const pixelX = (mouseX - offset.x) / scale
    const pixelY = (mouseY - offset.y) / scale

    const delta = e.deltaY > 0 ? -1 : 1
    const newScale = Math.max(2, Math.min(32, scale + delta))

    if (newScale !== scale) {
      setScale(newScale)
      setOffset({
        x: mouseX - pixelX * newScale,
        y: mouseY - pixelY * newScale
      })
    }
  }, [scale, offset])

  // Prevent page scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const preventScroll = (e: WheelEvent | TouchEvent) => {
      e.preventDefault()
    }

    container.addEventListener('wheel', preventScroll, { passive: false })
    container.addEventListener('touchmove', preventScroll, { passive: false })
    return () => {
      container.removeEventListener('wheel', preventScroll)
      container.removeEventListener('touchmove', preventScroll)
    }
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

  // Center view button
  const centerView = () => {
    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2
    setOffset({
      x: canvasSize.width / 2 - centerX * scale,
      y: canvasSize.height / 2 - centerY * scale
    })
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-900 touch-none ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'}`}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoveredPixel(null) }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => {
            const newScale = Math.max(2, scale - 1)
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
          className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-2xl font-bold"
        >
          −
        </button>
        <span className="w-14 h-12 bg-gray-800/90 rounded-lg text-white text-sm flex items-center justify-center font-mono">
          {scale}x
        </span>
        <button
          onClick={() => {
            const newScale = Math.min(32, scale + 1)
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
          className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-2xl font-bold"
        >
          +
        </button>
        <button
          onClick={centerView}
          className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-lg"
          title="Center"
        >
          ⊙
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-lg hidden sm:flex items-center justify-center"
          title="Fullscreen"
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

      {/* Help text - hide on mobile */}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs hidden sm:block">
        Scroll to zoom • Drag to pan
      </div>
    </div>
  )
}
