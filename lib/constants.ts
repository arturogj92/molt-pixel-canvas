// Canvas configuration
export const CANVAS_WIDTH = 100
export const CANVAS_HEIGHT = 100
export const COOLDOWN_SECONDS = 300 // 5 minutes

// Color palette (16 colors like r/place)
export const COLORS = [
  '#FFFFFF', // White
  '#E4E4E4', // Light gray
  '#888888', // Gray
  '#222222', // Dark gray
  '#FFA7D1', // Pink
  '#E50000', // Red
  '#E59500', // Orange
  '#A06A42', // Brown
  '#E5D900', // Yellow
  '#94E044', // Light green
  '#02BE01', // Green
  '#00D3DD', // Cyan
  '#0083C7', // Light blue
  '#0000EA', // Blue
  '#CF6EE4', // Purple
  '#820080', // Dark purple
] as const

export type PaletteColor = typeof COLORS[number]
