'use client'

import { ActionTypeV2 } from '@/types/habitEngine'

interface DailyProgressIndicatorProps {
  totalWeight: number
  actionCount: number
  highestAction: ActionTypeV2 | null
  className?: string
}

/**
 * SVG ring that fills based on daily connection weight.
 * Replaces the old progress bar with an organic ring visualization.
 */
function ConnectionRing({ percent, size = 40, strokeWidth = 3.5, color }: {
  percent: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#ECEAE6"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-deliberate ease-calm"
      />
    </svg>
  )
}

export default function DailyProgressIndicator({
  totalWeight,
  actionCount,
  highestAction,
  className = '',
}: DailyProgressIndicatorProps) {
  const isValidDay = totalWeight >= 0.5
  const progressPercent = Math.min(100, (totalWeight / 6) * 100)

  const getRingColor = () => {
    if (isValidDay && totalWeight >= 3) return '#5F7A6A' // moss — deep connection
    if (isValidDay) return '#5F7A6A' // moss — valid day
    if (totalWeight > 0) return '#E3B873' // sun — some progress
    return '#ECEAE6' // bone-warm — no progress
  }

  const getStatusText = () => {
    if (totalWeight === 0) return 'No actions yet today'
    if (!isValidDay) return 'Almost there'
    if (totalWeight >= 4) return 'Deep connection today'
    if (totalWeight >= 2) return 'Showing up changes things'
    return 'Another quiet step forward'
  }

  const getActionLabel = (action: ActionTypeV2): string => {
    const labels: Record<ActionTypeV2, string> = {
      text: 'Message',
      call: 'Call',
      in_person_1on1: 'In-person',
    }
    return labels[action]
  }

  return (
    <div className={`bg-white rounded-lg p-6 shadow-card ${className}`}>
      <div className="flex items-center gap-4">
        <ConnectionRing percent={progressPercent} color={getRingColor()} />
        <div className="flex-1 min-w-0">
          <span className="text-body-medium text-obsidian">
            Today&apos;s connection
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-micro ${isValidDay ? 'text-moss' : 'text-text-secondary'}`}>
              {getStatusText()}
            </span>
            {actionCount > 0 && (
              <span className="text-micro text-text-tertiary">
                {actionCount} action{actionCount !== 1 ? 's' : ''}
                {highestAction && ` · ${getActionLabel(highestAction)}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {!isValidDay && totalWeight === 0 && (
        <div className="mt-4 pt-4 border-t border-bone-warm">
          <p className="text-micro text-text-secondary">
            Any action counts. Even a quick message makes today a connection day.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Compact ring for the sticky header — 16px version
 */
export function CompactConnectionRing({ percent, color }: {
  percent: number
  color: string
}) {
  return (
    <ConnectionRing percent={percent} size={16} strokeWidth={2} color={color} />
  )
}
