'use client'

import {
  RelationshipStrength,
  STRENGTH_LABELS,
  DECAY_THRESHOLDS,
} from '@/types/habitEngine'

interface RelationshipStrengthBadgeProps {
  strength: RelationshipStrength
  daysSinceAction?: number | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const STRENGTH_CONFIG: Record<
  RelationshipStrength,
  { color: string; bgColor: string; icon: string; message: string }
> = {
  flourishing: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '🌟',
    message: 'Relationship is flourishing',
  },
  strong: {
    color: 'text-lime-700',
    bgColor: 'bg-lime-100',
    icon: '💪',
    message: 'Connection is strong',
  },
  stable: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '⚖️',
    message: 'Relationship is stable',
  },
  thinning: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '⚠️',
    message: 'Connection is thinning',
  },
  decaying: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🆘',
    message: 'Relationship needs attention',
  },
}

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

/**
 * Badge component showing the 5-tier relationship strength
 */
export default function RelationshipStrengthBadge({
  strength,
  daysSinceAction: _daysSinceAction,
  showLabel = true,
  size = 'md',
  className = '',
}: RelationshipStrengthBadgeProps) {
  void _daysSinceAction // Reserved for future tooltip enhancement
  const config = STRENGTH_CONFIG[strength]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.color} ${SIZE_CLASSES[size]} ${className}`}
      title={config.message}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{STRENGTH_LABELS[strength]}</span>}
    </span>
  )
}

/**
 * Detailed strength indicator with decay information
 */
export function RelationshipStrengthCard({
  strength,
  daysSinceAction,
  connectionName,
  className = '',
}: {
  strength: RelationshipStrength
  daysSinceAction: number | null
  connectionName?: string
  className?: string
}) {
  const config = STRENGTH_CONFIG[strength]

  const getDecayWarning = (): string | null => {
    if (daysSinceAction === null) return 'Never connected'
    if (daysSinceAction >= DECAY_THRESHOLDS.decay_state) {
      return `${daysSinceAction} days without contact - relationship decaying`
    }
    if (daysSinceAction >= DECAY_THRESHOLDS.erosion) {
      return `${daysSinceAction} days - connection eroding`
    }
    if (daysSinceAction >= DECAY_THRESHOLDS.weakening) {
      return `${daysSinceAction} days - connection weakening`
    }
    if (daysSinceAction >= DECAY_THRESHOLDS.thinning_signal) {
      return `${daysSinceAction} days since last connection`
    }
    return null
  }

  const decayWarning = getDecayWarning()
  const showWarning = strength === 'thinning' || strength === 'decaying'

  return (
    <div className={`rounded-xl p-4 ${config.bgColor} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${config.color}`}>
              {STRENGTH_LABELS[strength]}
            </span>
            {connectionName && (
              <span className="text-sm text-lavender-600">
                with {connectionName}
              </span>
            )}
          </div>
          <p className={`text-sm mt-1 ${config.color} opacity-80`}>
            {config.message}
          </p>
          {showWarning && decayWarning && (
            <p className="text-xs mt-2 text-lavender-600">
              {decayWarning}
            </p>
          )}
        </div>
      </div>

      {/* Progress to next state */}
      {(strength === 'thinning' || strength === 'stable') && daysSinceAction !== null && (
        <div className="mt-3 pt-3 border-t border-white/30">
          <div className="flex justify-between text-xs mb-1">
            <span className={config.color}>Time until next state</span>
            <span className={config.color}>
              {strength === 'thinning'
                ? `${Math.max(0, DECAY_THRESHOLDS.decay_state - daysSinceAction)} days`
                : `${Math.max(0, DECAY_THRESHOLDS.weakening - daysSinceAction)} days`}
            </span>
          </div>
          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                strength === 'thinning' ? 'bg-orange-500' : 'bg-yellow-500'
              }`}
              style={{
                width: `${
                  strength === 'thinning'
                    ? Math.min(100, ((daysSinceAction - DECAY_THRESHOLDS.erosion) / (DECAY_THRESHOLDS.decay_state - DECAY_THRESHOLDS.erosion)) * 100)
                    : Math.min(100, (daysSinceAction / DECAY_THRESHOLDS.weakening) * 100)
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Mini indicator for use in lists
 */
export function StrengthDot({
  strength,
  className = '',
}: {
  strength: RelationshipStrength
  className?: string
}) {
  const colors: Record<RelationshipStrength, string> = {
    flourishing: 'bg-green-500',
    strong: 'bg-lime-500',
    stable: 'bg-yellow-500',
    thinning: 'bg-orange-500',
    decaying: 'bg-red-500',
  }

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[strength]} ${className}`}
      title={STRENGTH_LABELS[strength]}
    />
  )
}
