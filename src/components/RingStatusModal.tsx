'use client'

import { RelationshipStrength, ActionTypeV2 } from '@/types/habitEngine'
import { getRingStatusDescription, calculateRingVisualization } from '@/lib/ringCalculations'
import { useScrollLock } from '@/lib/useScrollLock'

interface RingStatusModalProps {
  isOpen: boolean
  onClose: () => void
  connectionName: string
  strength: RelationshipStrength
  daysSinceAction: number
  lastActionType: ActionTypeV2 | null
  decayStartedAt: string | null
}

const STRENGTH_COLOR: Record<RelationshipStrength, string> = {
  flourishing: 'text-moss dark:text-dark-moss',
  strong: 'text-moss dark:text-dark-moss',
  stable: 'text-text-secondary dark:text-dark-text-secondary',
  thinning: 'text-sun dark:text-dark-sun',
  decaying: 'text-ember dark:text-dark-terracotta',
}

export default function RingStatusModal({
  isOpen,
  onClose,
  connectionName,
  strength,
  daysSinceAction,
  lastActionType,
  decayStartedAt,
}: RingStatusModalProps) {
  useScrollLock(isOpen)

  if (!isOpen) return null

  const { statusLabel, fillPercent, innerColor } = calculateRingVisualization(strength, daysSinceAction, decayStartedAt)
  const description = getRingStatusDescription(strength, daysSinceAction, lastActionType, decayStartedAt)
  const strengthColor = STRENGTH_COLOR[strength]

  // Mini ring preview (static, for illustration)
  const previewSize = 48
  const innerR = previewSize / 2 - 8
  const innerC = 2 * Math.PI * innerR
  const innerFilled = (fillPercent / 100) * innerC
  const outerR = previewSize / 2 - 3
  const outerC = 2 * Math.PI * outerR
  const outerFilled = (Math.max(0, fillPercent - 10) / 100) * outerC

  return (
    <div
      className="fixed inset-0 bg-obsidian/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-modal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center mb-4 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-bone-warm dark:bg-dark-surface-raised" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Mini ring preview */}
            <div className="relative flex-shrink-0" style={{ width: previewSize, height: previewSize }}>
              <svg width={previewSize} height={previewSize} className="absolute top-0 left-0 -rotate-90">
                <circle cx={previewSize / 2} cy={previewSize / 2} r={outerR} fill="none"
                  stroke="#2F4C5F" strokeWidth="1.5" strokeDasharray={`${outerFilled} ${outerC - outerFilled}`}
                  strokeLinecap="round" opacity={0.4} />
                <circle cx={previewSize / 2} cy={previewSize / 2} r={innerR} fill="none"
                  stroke={innerColor} strokeWidth="2" strokeDasharray={`${innerFilled} ${innerC - innerFilled}`}
                  strokeLinecap="round" opacity={0.75} />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-warm dark:bg-dark-surface-raised"
                style={{ width: previewSize - 18, height: previewSize - 18 }} />
            </div>
            <div>
              <div className="text-h3 text-obsidian dark:text-dark-text-primary leading-tight">{connectionName}</div>
              <div className={`text-micro-medium ${strengthColor} mt-0.5`}>{statusLabel}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary dark:text-dark-text-tertiary hover:text-obsidian dark:hover:text-dark-text-primary hover:bg-bone-warm dark:hover:bg-dark-surface-raised rounded-md transition-all duration-calm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <p className="text-body text-text-secondary dark:text-dark-text-secondary leading-relaxed mb-5">
          {description}
        </p>

        {/* Explainer card */}
        <div className="bg-inkblue-light dark:bg-dark-inkblue-subtle rounded-lg p-4 border-l-[2.5px] border-inkblue/40 dark:border-dark-border mb-5">
          <div className="text-micro-medium text-inkblue dark:text-dark-inkblue mb-1.5">How rings work</div>
          <p className="text-micro text-text-secondary dark:text-dark-text-secondary leading-relaxed">
            The outer ring shows depth, the inner ring shows recency. Both rings fill higher and glow brighter with frequent, meaningful contact — and fade when time passes.
          </p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-moss hover:opacity-90 text-bone text-body-medium rounded-md transition-all duration-calm"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
