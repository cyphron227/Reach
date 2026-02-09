'use client'

import {
  ActionTypeV2,
  ACTION_LABELS,
  ACTION_WEIGHTS,
  INSIGHT_MESSAGES,
} from '@/types/habitEngine'

interface EscalationNudgeProps {
  currentActionType: ActionTypeV2 | null
  suggestedActionType: ActionTypeV2
  connectionName?: string
  onAccept?: () => void
  onDismiss?: () => void
  variant?: 'inline' | 'card' | 'toast'
  className?: string
}

const ESCALATION_ICONS: Record<ActionTypeV2, string> = {
  text: '💬',
  call: '📞',
  in_person_1on1: '🤝',
}

/**
 * Nudge component that encourages users to escalate their connection methods
 * Tone: Supportive, never blocking, always optional
 */
export default function EscalationNudge({
  currentActionType,
  suggestedActionType,
  connectionName,
  onAccept,
  onDismiss,
  variant = 'card',
  className = '',
}: EscalationNudgeProps) {
  const currentWeight = currentActionType ? ACTION_WEIGHTS[currentActionType] : 0
  const suggestedWeight = ACTION_WEIGHTS[suggestedActionType]
  const weightIncrease = suggestedWeight - currentWeight

  // Get appropriate message based on escalation type
  const getMessage = (): string => {
    if (currentWeight <= 1 && suggestedWeight >= 3) {
      return INSIGHT_MESSAGES.text_to_call
    }
    if (currentWeight <= 3 && suggestedWeight >= 6) {
      return INSIGHT_MESSAGES.call_to_inperson
    }
    return `Consider ${ACTION_LABELS[suggestedActionType].toLowerCase()} for a deeper connection`
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <span className="text-lavender-500">Tip:</span>
        <span className="text-muted-teal-600">{getMessage()}</span>
        {onAccept && (
          <button
            type="button"
            onClick={onAccept}
            className="text-muted-teal-600 hover:text-muted-teal-700 underline"
          >
            Try it
          </button>
        )}
      </div>
    )
  }

  if (variant === 'toast') {
    return (
      <div
        className={`flex items-center gap-3 bg-muted-teal-50 border border-muted-teal-200 rounded-lg px-4 py-3 ${className}`}
      >
        <span className="text-xl">{ESCALATION_ICONS[suggestedActionType]}</span>
        <div className="flex-1">
          <p className="text-sm text-muted-teal-700">{getMessage()}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-teal-400 hover:text-muted-teal-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  // Card variant (default)
  return (
    <div
      className={`bg-gradient-to-r from-muted-teal-50 to-lavender-50 border border-muted-teal-200 rounded-xl p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
          <span className="text-xl">{ESCALATION_ICONS[suggestedActionType]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-lavender-800">
            {getMessage()}
          </p>

          {connectionName && (
            <p className="text-xs text-lavender-500 mt-1">
              Suggested for {connectionName}
            </p>
          )}

          {weightIncrease > 0 && (
            <p className="text-xs text-muted-teal-600 mt-2">
              +{weightIncrease} additional weight toward your daily goal
            </p>
          )}
        </div>
      </div>

      {(onAccept || onDismiss) && (
        <div className="flex gap-2 mt-4">
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 py-2 px-3 bg-muted-teal-500 hover:bg-muted-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {ACTION_LABELS[suggestedActionType]}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="py-2 px-3 bg-white hover:bg-lavender-50 text-lavender-600 text-sm font-medium rounded-lg border border-lavender-200 transition-colors"
            >
              Not now
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Simple text nudge for use in headers or status areas
 */
export function EscalationHint({
  currentActionType,
  className = '',
}: {
  currentActionType: ActionTypeV2 | null
  className?: string
}) {
  const currentWeight = currentActionType ? ACTION_WEIGHTS[currentActionType] : 0

  if (currentWeight >= 6) {
    return null // Already at highest level
  }

  let hint = ''
  if (currentWeight <= 1) {
    hint = INSIGHT_MESSAGES.text_to_call
  } else if (currentWeight <= 3) {
    hint = INSIGHT_MESSAGES.call_to_inperson
  }

  if (!hint) return null

  return (
    <p className={`text-xs text-lavender-500 italic ${className}`}>
      {hint}
    </p>
  )
}
