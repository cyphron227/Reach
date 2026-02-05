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
  coreCount: number // Current number of connections in core ring
  onChange: (tier: RingTier, position?: number | null) => void
  connectionName?: string
  disabled?: boolean
  className?: string
}

/**
 * Selector for assigning a connection to Core or Outer ring
 * Core ring is limited to 7 people
 */
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
      // Assign to next available position
      const newPosition = value === 'core' ? ringPosition : coreCount + 1
      onChange('core', newPosition)
    } else {
      onChange('outer', null)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Ring tier selection */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTierChange('core')}
          disabled={disabled}
          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
            value === 'core'
              ? 'border-muted-teal-500 bg-muted-teal-50'
              : 'border-lavender-200 bg-white hover:border-lavender-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">💎</span>
            <span
              className={`font-medium ${
                value === 'core' ? 'text-muted-teal-700' : 'text-lavender-700'
              }`}
            >
              {RING_LABELS.core}
            </span>
          </div>
          <p className="text-xs text-lavender-500 mt-1">
            {coreSlotsFilled}/{CORE_RING_MAX} slots
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleTierChange('outer')}
          disabled={disabled}
          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
            value === 'outer'
              ? 'border-muted-teal-500 bg-muted-teal-50'
              : 'border-lavender-200 bg-white hover:border-lavender-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">🌐</span>
            <span
              className={`font-medium ${
                value === 'outer' ? 'text-muted-teal-700' : 'text-lavender-700'
              }`}
            >
              {RING_LABELS.outer}
            </span>
          </div>
          <p className="text-xs text-lavender-500 mt-1">Unlimited</p>
        </button>
      </div>

      {/* Core ring warning */}
      {showCoreWarning && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-700">
            Your core circle is full ({CORE_RING_MAX} connections).
            {connectionName
              ? ` To add ${connectionName}, first move someone else to the outer circle.`
              : ' Move someone to the outer circle first.'}
          </p>
        </div>
      )}

      {/* Position selector (when in core) */}
      {value === 'core' && (
        <div className="bg-lavender-50 rounded-lg p-3">
          <p className="text-xs text-lavender-600 mb-2">
            Position in core circle (optional - for personal priority)
          </p>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: CORE_RING_MAX }, (_, i) => i + 1).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChange('core', pos)}
                disabled={disabled}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  ringPosition === pos
                    ? 'bg-muted-teal-500 text-white'
                    : 'bg-white border border-lavender-200 text-lavender-600 hover:border-muted-teal-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="text-xs text-lavender-500 space-y-1">
        <p>
          <strong>Core Circle:</strong> Your closest relationships. Limited to {CORE_RING_MAX} people
          to maintain meaningful connections.
        </p>
        <p>
          <strong>Outer Circle:</strong> Extended network. Important but with more flexible
          expectations.
        </p>
      </div>
    </div>
  )
}

/**
 * Compact ring indicator for use in lists
 */
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
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted-teal-100 text-muted-teal-700 ${className}`}
        title={`Core Circle${position ? ` #${position}` : ''}`}
      >
        💎 Core{position && <span className="opacity-70">#{position}</span>}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-lavender-100 text-lavender-600 ${className}`}
      title="Outer Circle"
    >
      🌐 Outer
    </span>
  )
}
