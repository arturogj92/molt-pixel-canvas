'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '@/lib/constants'

const TILE_SIZE = 100
const TILES_X = Math.ceil(CANVAS_WIDTH / TILE_SIZE)
const TILES_Y = Math.ceil(CANVAS_HEIGHT / TILE_SIZE)

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const loadedTilesRef = useRef<Set<string>>(new Set())
  const loadingTilesRef = useRef<Set<string>>(new Set())
  
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 })
  const [initialized, setInitialized] = useState(false)
  const [tilesLoaded, setTilesLoaded] = useState(0)
  const [renderTrigger, setRenderTrigger] = useState(0)

  // Initialize offscreen canvas
  useEffect(() => {
    if (!offscreenRef.current) {
      const offscreen = document.createElement('canvas')
      offscreen.width = CANVAS_WIDTH
      offscreen.height = CANVAS_HEIGHT
      const ctx = offscreen.getContext('2d', { alpha: false })
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        offscreenCtxRef.current = ctx
      }
      offscreenRef.current = offscreen
    }
  }, [])

  // Load a single tile
  const loadTile = useCallback(async (tileX: number, tileY: number) => {
    const key = `${tileX},${tileY}`
    if (loadedTilesRef.current.has(key) || loadingTilesRef.current.has(key)) return
    
    loadingTilesRef.current.add(key)
    const ctx = offscreenCtxRef.current
    if (!ctx) return

    try {
      const res = await fetch(`/api/tiles/${tileX}/${tileY}`)
      const text = await res.text()
      
      if (!text || text.startsWith('{')) {
        loadedTilesRef.current.add(key)
        loadingTilesRef.current.delete(key)
        return
      }

      // Fill tile with white first
      const startX = tileX * TILE_SIZE
      const startY = tileY * TILE_SIZE
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(startX, startY, TILE_SIZE, TILE_SIZE)

      // Parse and draw pixels
      const pixels = text.split(';').filter(p => p)
      for (const p of pixels) {
        const [lx, ly, c] = p.split(',').map(Number)
        if (!isNaN(lx) && !isNaN(ly) && !isNaN(c)) {
          ctx.fillStyle = COLORS[c] || '#FFFFFF'
          ctx.fillRect(startX + lx, startY + ly, 1, 1)
        }
      }

      loadedTilesRef.current.add(key)
      loadingTilesRef.current.delete(key)
      setTilesLoaded(prev => prev + 1)
      setRenderTrigger(prev => prev + 1)
    } catch (err) {
      console.error(`Error loading tile ${key}:`, err)
      loadingTilesRef.current.delete(key)
    }
  }, [])

  // Calculate visible tiles and load them IN PARALLEL
  const loadVisibleTiles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Calculate visible area in pixel coordinates
    const visibleLeft = Math.max(0, Math.floor(-offset.x / scale))
    const visibleTop = Math.max(0, Math.floor(-offset.y / scale))
    const visibleRight = Math.min(CANVAS_WIDTH, Math.ceil((canvas.width - offset.x) / scale))
    const visibleBottom = Math.min(CANVAS_HEIGHT, Math.ceil((canvas.height - offset.y) / scale))

    // Calculate tile range (with 1 tile padding for smoother panning)
    const tileLeft = Math.max(0, Math.floor(visibleLeft / TILE_SIZE) - 1)
    const tileTop = Math.max(0, Math.floor(visibleTop / TILE_SIZE) - 1)
    const tileRight = Math.min(TILES_X - 1, Math.floor(visibleRight / TILE_SIZE) + 1)
    const tileBottom = Math.min(TILES_Y - 1, Math.floor(visibleBottom / TILE_SIZE) + 1)

    // Load ALL visible tiles in parallel
    const tilesToLoad: Promise<void>[] = []
    for (let ty = tileTop; ty <= tileBottom; ty++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        tilesToLoad.push(loadTile(tx, ty))
      }
    }
    
    // Wait for all to complete
    Promise.all(tilesToLoad)
  }, [offset, scale, loadTile])

  // Load tiles when view changes
  useEffect(() => {
    loadVisibleTiles()
  }, [loadVisibleTiles])

  // Refresh tiles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadedTilesRef.current.clear()
      loadVisibleTiles()
    }, 15000)
    return () => clearInterval(interval)
  }, [loadVisibleTiles])

  // Resize handling
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = rect.width || window.innerWidth
        const newHeight = rect.height || window.innerHeight
        setCanvasSize({ width: newWidth, height: newHeight })
        
        if (!initialized) {
          const initialScale = Math.min(newWidth / CANVAS_WIDTH, newHeight / CANVAS_HEIGHT) * 0.9
          setScale(initialScale)
          setOffset({
            x: newWidth / 2 - (CANVAS_WIDTH / 2) * initialScale,
            y: newHeight / 2 - (CANVAS_HEIGHT / 2) * initialScale
          })
          setInitialized(true)
        }
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [initialized])

  // Fullscreen
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (document.fullscreenElement) {
        setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
      }
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // RENDER
  useEffect(() => {
    const canvas = canvasRef.current
    const offscreen = offscreenRef.current
    if (!canvas || !offscreen) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const srcX = Math.max(0, Math.floor(-offset.x / scale))
    const srcY = Math.max(0, Math.floor(-offset.y / scale))
    const srcW = Math.min(CANVAS_WIDTH - srcX, Math.ceil(canvas.width / scale) + 2)
    const srcH = Math.min(CANVAS_HEIGHT - srcY, Math.ceil(canvas.height / scale) + 2)
    const dstX = Math.floor(srcX * scale + offset.x)
    const dstY = Math.floor(srcY * scale + offset.y)
    const dstW = Math.floor(srcW * scale)
    const dstH = Math.floor(srcH * scale)

    if (srcW > 0 && srcH > 0) {
      ctx.drawImage(offscreen, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)
    }

    // Grid at high zoom
    if (scale >= 10) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = srcX; x <= srcX + srcW; x++) {
        const drawX = Math.floor(x * scale + offset.x)
        ctx.moveTo(drawX, dstY); ctx.lineTo(drawX, dstY + dstH)
      }
      for (let y = srcY; y <= srcY + srcH; y++) {
        const drawY = Math.floor(y * scale + offset.y)
        ctx.moveTo(dstX, drawY); ctx.lineTo(dstX + dstW, drawY)
      }
      ctx.stroke()
    }

    if (hoveredPixel) {
      const hx = Math.floor(hoveredPixel.x * scale + offset.x)
      const hy = Math.floor(hoveredPixel.y * scale + offset.y)
      ctx.strokeStyle = '#E50000'; ctx.lineWidth = 2
      ctx.strokeRect(hx, hy, Math.floor(scale), Math.floor(scale))
    }
  }, [scale, offset, hoveredPixel, canvasSize, renderTrigger])

  // Input handlers
  const getPixelCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((clientX - rect.left - offset.x) / scale)
    const y = Math.floor((clientY - rect.top - offset.y) / scale)
    return (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) ? { x, y } : null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    } else {
      setHoveredPixel(getPixelCoords(e.clientX, e.clientY))
    }
  }

  const lastTouchRef = useRef<{ x: number; y: number; dist?: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y })
    } else if (e.touches.length === 2) {
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
      setOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y })
    } else if (e.touches.length === 2 && lastTouchRef.current?.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const newDist = Math.hypot(dx, dy)
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const tx = cx - rect.left, ty = cy - rect.top
        const px = (tx - offset.x) / scale, py = (ty - offset.y) / scale
        const ns = Math.max(0.5, Math.min(100, scale * (newDist / lastTouchRef.current.dist)))
        setScale(ns)
        setOffset({ x: tx - px * ns, y: ty - py * ns })
      }
      lastTouchRef.current = { x: cx, y: cy, dist: newDist }
    }
    e.preventDefault()
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const px = (mx - offset.x) / scale, py = (my - offset.y) / scale
    const ns = Math.max(0.5, Math.min(100, scale * (e.deltaY > 0 ? 0.97 : 1.03)))
    setScale(ns)
    setOffset({ x: mx - px * ns, y: my - py * ns })
  }, [scale, offset])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const prevent = (e: Event) => e.preventDefault()
    c.addEventListener('wheel', prevent, { passive: false })
    c.addEventListener('touchmove', prevent, { passive: false })
    return () => { c.removeEventListener('wheel', prevent); c.removeEventListener('touchmove', prevent) }
  }, [])

  const centerView = () => setOffset({
    x: canvasSize.width / 2 - (CANVAS_WIDTH / 2) * scale,
    y: canvasSize.height / 2 - (CANVAS_HEIGHT / 2) * scale
  })

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-gray-900 touch-none ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'}`} onContextMenu={e => e.preventDefault()}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="cursor-grab active:cursor-grabbing touch-none"
        style={{ imageRendering: 'pixelated' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => { setIsDragging(false); setHoveredPixel(null) }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { setIsDragging(false); lastTouchRef.current = null }}
      />

      {/* Loading indicator */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-gray-800/90 rounded text-white text-sm">
        Tiles: {tilesLoaded}/100
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button onClick={() => { const s = Math.max(0.5, scale*0.8), cx = canvasSize.width/2, cy = canvasSize.height/2, px = (cx-offset.x)/scale, py = (cy-offset.y)/scale; setScale(s); setOffset({x:cx-px*s, y:cy-py*s}) }} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-2xl font-bold">−</button>
        <span className="w-16 h-12 bg-gray-800/90 rounded-lg text-white text-sm flex items-center justify-center font-mono">{scale.toFixed(1)}x</span>
        <button onClick={() => { const s = Math.min(100, scale*1.25), cx = canvasSize.width/2, cy = canvasSize.height/2, px = (cx-offset.x)/scale, py = (cy-offset.y)/scale; setScale(s); setOffset({x:cx-px*s, y:cy-py*s}) }} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-2xl font-bold">+</button>
        <button onClick={centerView} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-lg">⊙</button>
        <button onClick={() => containerRef.current && (document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen())} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-lg hidden sm:flex items-center justify-center">{isFullscreen ? '✕' : '⛶'}</button>
      </div>

      {hoveredPixel && <div className="absolute top-4 left-4 px-3 py-1.5 bg-gray-800/90 rounded text-white text-sm font-mono">({hoveredPixel.x}, {hoveredPixel.y})</div>}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs hidden sm:block">Scroll to zoom • Drag to pan</div>
    </div>
  )
}
