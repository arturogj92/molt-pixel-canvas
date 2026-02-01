'use client'

import { useState, useEffect } from 'react'

interface CooldownTimerProps {
  canPlaceAt: string | null
  onCooldownEnd: () => void
}

export default function CooldownTimer({ canPlaceAt, onCooldownEnd }: CooldownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  useEffect(() => {
    if (!canPlaceAt) {
      setSecondsRemaining(0)
      return
    }

    const targetTime = new Date(canPlaceAt).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000))
      setSecondsRemaining(remaining)

      if (remaining <= 0) {
        onCooldownEnd()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [canPlaceAt, onCooldownEnd])

  if (secondsRemaining <= 0) {
    return (
      <div className="px-4 py-2 bg-green-600 rounded-lg text-white font-medium">
        ✓ Ready to place!
      </div>
    )
  }

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60

  return (
    <div className="px-4 py-2 bg-gray-800 rounded-lg text-white">
      <div className="text-sm text-gray-400 mb-1">Cooldown</div>
      <div className="text-2xl font-mono">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  )
}
