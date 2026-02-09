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
  { dotColor: string; textColor: string; message: string }
> = {
  flourishing: {
    dotColor: 'bg-moss',
    textColor: 'text-moss',
    message: 'Relationship is flourishing',
  },
  strong: {
    dotColor: 'bg-moss',
    textColor: 'text-moss',
    message: 'Connection is strong',
  },
  stable: {
    dotColor: 'bg-ash',
    textColor: 'text-ash',
    message: 'Relationship is stable',
  },
  thinning: {
    dotColor: 'bg-sun',
    textColor: 'text-sun',
    message: 'Connection is thinning',
  },
  decaying: {
    dotColor: 'bg-ember',
    textColor: 'text-ember',
    message: 'Relationship needs attention',
  },
}

const SIZE_CLASSES = {
  sm: 'text-micro',
  md: 'text-micro-medium',
  lg: 'text-body-medium',
}

export default function RelationshipStrengthBadge({
  strength,
  daysSinceAction: _daysSinceAction,
  showLabel = true,
  size = 'md',
  className = '',
}: RelationshipStrengthBadgeProps) {
  void _daysSinceAction
  const config = STRENGTH_CONFIG[strength]

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${config.textColor} ${SIZE_CLASSES[size]} ${className}`}
      title={config.message}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${config.dotColor}`} />
      {showLabel && <span>{STRENGTH_LABELS[strength]}</span>}
    </span>
  )
}

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
      return `${daysSinceAction} days without contact`
    }
    if (daysSinceAction >= DECAY_THRESHOLDS.erosion) {
      return `${daysSinceAction} days — connection eroding`
    }
    if (daysSinceAction >= DECAY_THRESHOLDS.weakening) {
      return `${daysSinceAction} days — connection weakening`
    }
    if (daysSinceAction >= DECAY_THRESHOLDS.thinning_signal) {
      return `${daysSinceAction} days since last connection`
    }
    return null
  }

  const decayWarning = getDecayWarning()
  const showWarning = strength === 'thinning' || strength === 'decaying'

  return (
    <div className={`rounded-lg p-4 bg-bone-warm shadow-subtle ${className}`}>
      <div className="flex items-start gap-3">
        <span className={`inline-block w-3 h-3 rounded-full mt-1 ${config.dotColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-body-medium ${config.textColor}`}>
              {STRENGTH_LABELS[strength]}
            </span>
            {connectionName && (
              <span className="text-micro text-ash">
                with {connectionName}
              </span>
            )}
          </div>
          <p className="text-micro text-ash mt-1">
            {config.message}
          </p>
          {showWarning && decayWarning && (
            <p className="text-micro text-ash mt-2">
              {decayWarning}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function StrengthDot({
  strength,
  className = '',
}: {
  strength: RelationshipStrength
  className?: string
}) {
  const colors: Record<RelationshipStrength, string> = {
    flourishing: 'bg-moss',
    strong: 'bg-moss',
    stable: 'bg-ash',
    thinning: 'bg-sun',
    decaying: 'bg-ember',
  }

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[strength]} ${className}`}
      title={STRENGTH_LABELS[strength]}
    />
  )
}
