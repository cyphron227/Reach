'use client'

import { ACTION_WEIGHTS, ActionTypeV2 } from '@/types/habitEngine'

interface DailyProgressIndicatorProps {
  totalWeight: number
  actionCount: number
  highestAction: ActionTypeV2 | null
  className?: string
}

/**
 * Shows the user's daily progress toward a "valid day" (weight >= 0.5)
 * Displays a progress bar and current weight status
 */
export default function DailyProgressIndicator({
  totalWeight,
  actionCount,
  highestAction,
  className = '',
}: DailyProgressIndicatorProps) {
  const isValidDay = totalWeight >= 0.5
  const progressPercent = Math.min(100, (totalWeight / 6) * 100) // 6 is max weight (in_person_1on1)

  // Determine color based on progress
  const getProgressColor = () => {
    if (isValidDay && totalWeight >= 3) return 'bg-green-500' // Great day
    if (isValidDay) return 'bg-muted-teal-500' // Valid day
    if (totalWeight > 0) return 'bg-yellow-500' // Some progress
    return 'bg-lavender-300' // No progress
  }

  const getStatusText = () => {
    if (totalWeight === 0) return 'No actions yet today'
    if (!isValidDay) return 'Almost there...'
    if (totalWeight >= 4) return 'Amazing investment!'
    if (totalWeight >= 2) return 'Great connection day'
    return 'Valid day achieved'
  }

  const getActionLabel = (action: ActionTypeV2): string => {
    const labels: Record<ActionTypeV2, string> = {
      self_reflection: 'Reflection',
      text: 'Text',
      social_planning: 'Planning',
      call: 'Call',
      group_activity: 'Group',
      in_person_1on1: 'In-person',
    }
    return labels[action]
  }

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-lavender-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {isValidDay ? '✓' : '○'}
          </span>
          <span className="text-sm font-medium text-lavender-800">
            Today&apos;s Investment
          </span>
        </div>
        <div className="text-right">
          <span className="text-lg font-semibold text-lavender-800">
            {totalWeight.toFixed(1)}
          </span>
          <span className="text-xs text-lavender-500 ml-1">weight</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-lavender-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status text */}
      <div className="flex items-center justify-between text-xs">
        <span className={isValidDay ? 'text-muted-teal-600 font-medium' : 'text-lavender-500'}>
          {getStatusText()}
        </span>
        {actionCount > 0 && (
          <span className="text-lavender-500">
            {actionCount} action{actionCount !== 1 ? 's' : ''}
            {highestAction && ` · Best: ${getActionLabel(highestAction)}`}
          </span>
        )}
      </div>

      {/* Weight scale hint */}
      {!isValidDay && totalWeight === 0 && (
        <div className="mt-3 pt-3 border-t border-lavender-100">
          <p className="text-xs text-lavender-500">
            Any action counts! Even a quick reflection ({ACTION_WEIGHTS.self_reflection} weight) makes today valid.
          </p>
        </div>
      )}
    </div>
  )
}
