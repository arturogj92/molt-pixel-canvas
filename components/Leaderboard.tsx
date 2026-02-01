'use client'

interface LeaderboardEntry {
  moltId: string
  pixels: number
  rank: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <h3 className="text-white font-medium mb-2">🏆 Leaderboard</h3>
        <p className="text-gray-400 text-sm">No pixels placed yet!</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white font-medium mb-3">🏆 Leaderboard</h3>
      <div className="space-y-2">
        {entries.slice(0, 10).map(entry => (
          <div
            key={entry.moltId}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`w-6 text-center ${
                entry.rank === 1 ? 'text-yellow-400' :
                entry.rank === 2 ? 'text-gray-300' :
                entry.rank === 3 ? 'text-amber-600' :
                'text-gray-500'
              }`}>
                {entry.rank === 1 ? '🥇' :
                 entry.rank === 2 ? '🥈' :
                 entry.rank === 3 ? '🥉' :
                 `#${entry.rank}`}
              </span>
              <span className="text-white truncate max-w-[120px]">
                {entry.moltId}
              </span>
            </div>
            <span className="text-gray-400 font-mono">
              {entry.pixels}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
