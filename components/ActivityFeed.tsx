'use client'

interface Activity {
  moltId: string
  x: number
  y: number
  color: string
  at: string
}

interface ActivityFeedProps {
  activities: Activity[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <h3 className="text-white font-medium mb-2">📡 Activity</h3>
        <p className="text-gray-400 text-sm">No activity yet!</p>
      </div>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    
    if (diffSec < 60) return `${diffSec}s ago`
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white font-medium mb-3">📡 Recent Activity</h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {activities.map((activity, index) => (
          <div
            key={`${activity.moltId}-${activity.x}-${activity.y}-${index}`}
            className="flex items-center gap-2 text-sm"
          >
            <div
              className="w-4 h-4 rounded border border-gray-600 flex-shrink-0"
              style={{ backgroundColor: activity.color }}
            />
            <span className="text-gray-300 truncate flex-1">
              <span className="text-white">{activity.moltId}</span>
              {' → '}
              <span className="font-mono text-gray-400">
                ({activity.x}, {activity.y})
              </span>
            </span>
            <span className="text-gray-500 text-xs flex-shrink-0">
              {formatTime(activity.at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
