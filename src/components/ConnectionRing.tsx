'use client'

import { RelationshipStrength } from '@/types/habitEngine'
import { calculateRingVisualization } from '@/lib/ringCalculations'

interface ConnectionRingProps {
  name: string
  strength?: RelationshipStrength
  daysSinceAction?: number
  decayStartedAt?: string | null
  size?: 72 | 120
  onClick?: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default function ConnectionRing({
  name,
  strength,
  daysSinceAction = 0,
  decayStartedAt = null,
  size = 72,
  onClick,
}: ConnectionRingProps) {
  const effectiveStrength: RelationshipStrength = strength ?? 'stable'

  const {
    fillPercent,
    innerOpacity,
    outerOpacity,
    innerColor,
    outerColor,
    shouldPulse,
  } = calculateRingVisualization(effectiveStrength, daysSinceAction, decayStartedAt)

  // Inner ring geometry
  const innerRadius = size / 2 - 10
  const innerCircumference = 2 * Math.PI * innerRadius
  const innerFilled = (fillPercent / 100) * innerCircumference
  const innerGap = innerCircumference - innerFilled

  // Outer ring geometry (slightly less fill)
  const outerRadius = size / 2 - 4
  const outerCircumference = 2 * Math.PI * outerRadius
  const outerFillPercent = Math.max(0, fillPercent - 10)
  const outerFilled = (outerFillPercent / 100) * outerCircumference
  const outerGap = outerCircumference - outerFilled

  const centerSize = size - 24
  const initials = getInitials(name)
  const fontSize = size === 120 ? 'text-[32px]' : 'text-[14px]'

  return (
    <div
      className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <svg
        width={size}
        height={size}
        className={`absolute top-0 left-0 -rotate-90 ${shouldPulse ? 'animate-gentle-pulse' : ''}`}
      >
        {/* Outer ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke={outerColor}
          strokeWidth="2"
          strokeDasharray={`${outerFilled} ${outerGap}`}
          strokeLinecap="round"
          opacity={outerOpacity}
          className="transition-all duration-deliberate ease-calm"
        />
        {/* Inner ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke={innerColor}
          strokeWidth="2.5"
          strokeDasharray={`${innerFilled} ${innerGap}`}
          strokeLinecap="round"
          opacity={innerOpacity}
          className="transition-all duration-deliberate ease-calm"
        />
      </svg>
      {/* Center initials */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-warm flex items-center justify-center font-medium text-slate ${fontSize}`}
        style={{ width: centerSize, height: centerSize }}
      >
        {initials}
      </div>
    </div>
  )
}
