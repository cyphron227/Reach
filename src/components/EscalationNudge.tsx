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
      <div className={`flex items-center gap-2 text-body ${className}`}>
        <span className="text-text-tertiary dark:text-dark-text-tertiary">Tip:</span>
        <span className="text-moss dark:text-dark-moss">{getMessage()}</span>
        {onAccept && (
          <button
            type="button"
            onClick={onAccept}
            className="text-moss dark:text-dark-moss hover:opacity-90 underline transition-all duration-calm"
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
        className={`flex items-center gap-3 bg-moss-light border-l-[2.5px] border-moss/40 rounded-md px-4 py-3 ${className}`}
      >
        <div className="text-body font-medium text-moss dark:text-dark-moss">{ACTION_LABELS[suggestedActionType]}</div>
        <div className="flex-1">
          <p className="text-body text-obsidian dark:text-dark-text-primary">{getMessage()}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-text-tertiary dark:text-dark-text-tertiary hover:text-obsidian dark:hover:text-dark-text-primary transition-all duration-calm"
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
      className={`bg-moss-light border-l-[2.5px] border-moss/40 rounded-md p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-bone-warm dark:bg-dark-surface-raised rounded-full flex items-center justify-center shadow-card">
          <span className="text-body font-medium text-moss dark:text-dark-moss">{ACTION_LABELS[suggestedActionType]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-obsidian dark:text-dark-text-primary">
            {getMessage()}
          </p>

          {connectionName && (
            <p className="text-micro text-text-tertiary dark:text-dark-text-tertiary mt-1">
              Suggested for {connectionName}
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
              className="flex-1 py-2 px-3 bg-moss hover:opacity-90 text-bone text-body font-medium rounded-md transition-all duration-calm"
            >
              {ACTION_LABELS[suggestedActionType]}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="py-2 px-3 bg-bone-warm dark:bg-dark-surface-raised hover:bg-bone-warm dark:hover:bg-dark-surface-hover text-obsidian dark:text-dark-text-primary text-body font-medium rounded-md transition-all duration-calm"
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
    <p className={`text-micro text-text-tertiary dark:text-dark-text-tertiary italic ${className}`}>
      {hint}
    </p>
  )
}
