'use client'

import { useState } from 'react'
import {
  RingTier,
  RING_LABELS,
  CORE_RING_MAX,
} from '@/types/habitEngine'

interface RingSelectorProps {
  value: RingTier
  ringPosition?: number | null
  coreCount: number
  onChange: (tier: RingTier, position?: number | null) => void
  connectionName?: string
  disabled?: boolean
  className?: string
}

export default function RingSelector({
  value,
  ringPosition,
  coreCount,
  onChange,
  connectionName,
  disabled = false,
  className = '',
}: RingSelectorProps) {
  const [showCoreWarning, setShowCoreWarning] = useState(false)

  const canAddToCore = coreCount < CORE_RING_MAX || value === 'core'
  const coreSlotsFilled = value === 'core' ? coreCount : coreCount

  const handleTierChange = (newTier: RingTier) => {
    if (newTier === 'core' && !canAddToCore) {
      setShowCoreWarning(true)
      return
    }

    setShowCoreWarning(false)

    if (newTier === 'core') {
      const newPosition = value === 'core' ? ringPosition : coreCount + 1
      onChange('core', newPosition)
    } else {
      onChange('outer', null)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTierChange('core')}
          disabled={disabled}
          className={`flex-1 py-3 px-4 rounded-md border-2 transition-all duration-calm ${
            value === 'core'
              ? 'border-moss bg-bone-warm dark:bg-dark-surface-raised'
              : 'border-bone-warm dark:border-dark-border bg-bone dark:bg-dark-bg hover:border-text-placeholder'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className={`text-body-medium ${value === 'core' ? 'text-moss dark:text-dark-moss' : 'text-obsidian dark:text-dark-text-primary'}`}>
              {RING_LABELS.core}
            </span>
          </div>
          <p className="text-label text-text-tertiary dark:text-dark-text-tertiary mt-1">
            {coreSlotsFilled}/{CORE_RING_MAX} slots
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleTierChange('outer')}
          disabled={disabled}
          className={`flex-1 py-3 px-4 rounded-md border-2 transition-all duration-calm ${
            value === 'outer'
              ? 'border-moss bg-bone-warm dark:bg-dark-surface-raised'
              : 'border-bone-warm dark:border-dark-border bg-bone dark:bg-dark-bg hover:border-text-placeholder'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className={`text-body-medium ${value === 'outer' ? 'text-moss dark:text-dark-moss' : 'text-obsidian dark:text-dark-text-primary'}`}>
              {RING_LABELS.outer}
            </span>
          </div>
          <p className="text-label text-text-tertiary dark:text-dark-text-tertiary mt-1">Unlimited</p>
        </button>
      </div>

      {showCoreWarning && (
        <div className="bg-bone-warm dark:bg-dark-surface-raised rounded-md p-3">
          <p className="text-micro text-ember dark:text-dark-terracotta">
            Your core circle is full ({CORE_RING_MAX} connections).
            {connectionName
              ? ` To add ${connectionName}, first move someone else to the outer circle.`
              : ' Move someone to the outer circle first.'}
          </p>
        </div>
      )}

      {value === 'core' && (
        <div className="bg-bone-warm dark:bg-dark-surface-raised rounded-md p-3">
          <p className="text-label text-text-secondary dark:text-dark-text-secondary mb-2">
            Position in core circle (optional)
          </p>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: CORE_RING_MAX }, (_, i) => i + 1).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChange('core', pos)}
                disabled={disabled}
                className={`w-8 h-8 rounded-full text-label transition-all duration-calm ${
                  ringPosition === pos
                    ? 'bg-moss text-bone'
                    : 'bg-bone dark:bg-dark-bg border border-bone-warm dark:border-dark-border text-text-tertiary dark:text-dark-text-tertiary hover:border-moss'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-micro text-text-secondary dark:text-dark-text-secondary space-y-1">
        <p>
          <strong className="text-obsidian dark:text-dark-text-primary">Core circle:</strong> Your closest relationships. Limited to {CORE_RING_MAX} people.
        </p>
        <p>
          <strong className="text-obsidian dark:text-dark-text-primary">Outer circle:</strong> Extended network with more flexible expectations.
        </p>
      </div>
    </div>
  )
}

export function RingBadge({
  tier,
  position,
  className = '',
}: {
  tier: RingTier
  position?: number | null
  className?: string
}) {
  if (tier === 'core') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label bg-bone-warm dark:bg-dark-surface-raised text-moss dark:text-dark-moss ${className}`}
        title={`Core circle${position ? ` #${position}` : ''}`}
      >
        Core{position && <span className="opacity-70">#{position}</span>}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label bg-bone-warm dark:bg-dark-surface-raised text-text-secondary dark:text-dark-text-secondary ${className}`}
      title="Outer circle"
    >
      Outer
    </span>
  )
}
