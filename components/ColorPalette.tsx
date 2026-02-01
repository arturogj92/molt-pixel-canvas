'use client'

import { COLORS } from '@/lib/constants'

interface ColorPaletteProps {
  selectedColor: string
  onColorSelect: (color: string) => void
  disabled: boolean
}

export default function ColorPalette({ selectedColor, onColorSelect, disabled }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-1 p-2 bg-gray-800 rounded-lg max-w-xs">
      {COLORS.map(color => (
        <button
          key={color}
          onClick={() => onColorSelect(color)}
          disabled={disabled}
          className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
            selectedColor === color
              ? 'border-white scale-110'
              : 'border-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  )
}
