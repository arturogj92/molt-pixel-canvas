'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '@/lib/constants'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 })
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(0)

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

  // Load canvas from compact format
  const loadCanvas = useCallback(async () => {
    const ctx = offscreenCtxRef.current
    if (!ctx) return

    try {
      setLoadProgress(0)
      const res = await fetch(`/api/canvas/compact?t=${Date.now()}`)
      const text = await res.text()
      
      if (!text || text.startsWith('{')) {
        // Error or empty
        setLoading(false)
        return
      }

      // Clear to white first
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Parse compact format: "x,y,colorIdx;x,y,colorIdx;..."
      const pixels = text.split(';').filter(p => p)
      const total = pixels.length
      
      // Process in chunks to not block UI
      const CHUNK = 50000
      for (let i = 0; i < pixels.length; i += CHUNK) {
        const chunk = pixels.slice(i, i + CHUNK)
        
        for (const p of chunk) {
          const [x, y, c] = p.split(',').map(Number)
          if (!isNaN(x) && !isNaN(y) && !isNaN(c)) {
            ctx.fillStyle = COLORS[c] || '#FFFFFF'
            ctx.fillRect(x, y, 1, 1)
          }
        }
        
        setLoadProgress(Math.min(100, Math.round((i + chunk.length) / total * 100)))
        
        // Yield to UI
        await new Promise(r => setTimeout(r, 0))
      }

      setLoading(false)
      setLastUpdate(Date.now())
    } catch (err) {
      console.error('Error loading canvas:', err)
      setLoading(false)
    }
  }, [])

  // Initial load + periodic refresh
  useEffect(() => {
    loadCanvas()
    const interval = setInterval(loadCanvas, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [loadCanvas])

  // Resize handling
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = rect.width || window.innerWidth
        const newHeight = rect.height || window.innerHeight
        setCanvasSize({ width: newWidth, height: newHeight })
        
        if (!initialized) {
          const centerX = CANVAS_WIDTH / 2
          const centerY = CANVAS_HEIGHT / 2
          const initialScale = Math.min(newWidth / CANVAS_WIDTH, newHeight / CANVAS_HEIGHT) * 0.9
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

  // Fullscreen
  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)
      if (isFs) setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
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

    if (scale >= 10) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = srcX; x <= srcX + srcW; x++) {
        const drawX = Math.floor(x * scale + offset.x)
        ctx.moveTo(drawX, dstY)
        ctx.lineTo(drawX, dstY + dstH)
      }
      for (let y = srcY; y <= srcY + srcH; y++) {
        const drawY = Math.floor(y * scale + offset.y)
        ctx.moveTo(dstX, drawY)
        ctx.lineTo(dstX + dstW, drawY)
      }
      ctx.stroke()
    }

    if (hoveredPixel) {
      const hx = Math.floor(hoveredPixel.x * scale + offset.x)
      const hy = Math.floor(hoveredPixel.y * scale + offset.y)
      const hs = Math.floor(scale)
      ctx.strokeStyle = '#E50000'
      ctx.lineWidth = 2
      ctx.strokeRect(hx, hy, hs, hs)
    }
  }, [scale, offset, hoveredPixel, canvasSize, lastUpdate])

  const getPixelCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((clientX - rect.left - offset.x) / scale)
    const y = Math.floor((clientY - rect.top - offset.y) / scale)
    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) return { x, y }
    return null
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
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const touchX = centerX - rect.left
        const touchY = centerY - rect.top
        const pixelX = (touchX - offset.x) / scale
        const pixelY = (touchY - offset.y) / scale
        const newScale = Math.max(0.5, Math.min(100, scale * (newDist / lastTouchRef.current.dist)))
        setScale(newScale)
        setOffset({ x: touchX - pixelX * newScale, y: touchY - pixelY * newScale })
      }
      lastTouchRef.current = { x: centerX, y: centerY, dist: newDist }
    }
    e.preventDefault()
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const pixelX = (mouseX - offset.x) / scale
    const pixelY = (mouseY - offset.y) / scale
    const newScale = Math.max(0.5, Math.min(100, scale * (e.deltaY > 0 ? 0.97 : 1.03)))
    setScale(newScale)
    setOffset({ x: mouseX - pixelX * newScale, y: mouseY - pixelY * newScale })
  }, [scale, offset])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const prevent = (e: WheelEvent | TouchEvent) => e.preventDefault()
    container.addEventListener('wheel', prevent, { passive: false })
    container.addEventListener('touchmove', prevent, { passive: false })
    return () => {
      container.removeEventListener('wheel', prevent)
      container.removeEventListener('touchmove', prevent)
    }
  }, [])

  const centerView = () => {
    setOffset({
      x: canvasSize.width / 2 - (CANVAS_WIDTH / 2) * scale,
      y: canvasSize.height / 2 - (CANVAS_HEIGHT / 2) * scale
    })
  }

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

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
          <div className="text-white text-lg mb-4">Loading 1M pixels...</div>
          <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${loadProgress}%` }} />
          </div>
          <div className="text-gray-400 text-sm mt-2">{loadProgress}%</div>
        </div>
      )}
      
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button onClick={() => { const s = Math.max(0.5, scale * 0.8); const cx = canvasSize.width/2, cy = canvasSize.height/2; setOffset({x: cx - ((cx-offset.x)/scale)*s, y: cy - ((cy-offset.y)/scale)*s}); setScale(s) }} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-2xl font-bold">−</button>
        <span className="w-16 h-12 bg-gray-800/90 rounded-lg text-white text-sm flex items-center justify-center font-mono">{scale.toFixed(1)}x</span>
        <button onClick={() => { const s = Math.min(100, scale * 1.25); const cx = canvasSize.width/2, cy = canvasSize.height/2; setOffset({x: cx - ((cx-offset.x)/scale)*s, y: cy - ((cy-offset.y)/scale)*s}); setScale(s) }} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-2xl font-bold">+</button>
        <button onClick={centerView} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-lg">⊙</button>
        <button onClick={() => containerRef.current && (document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen())} className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-lg hidden sm:flex items-center justify-center">{isFullscreen ? '✕' : '⛶'}</button>
      </div>

      {hoveredPixel && <div className="absolute top-4 left-4 px-3 py-1.5 bg-gray-800/90 rounded text-white text-sm font-mono">({hoveredPixel.x}, {hoveredPixel.y})</div>}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs hidden sm:block">Scroll to zoom • Drag to pan</div>
    </div>
  )
}
