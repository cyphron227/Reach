'use client'

import { RelationshipStrength } from '@/types/habitEngine'

interface ConnectionRingProps {
  name: string
  strength?: RelationshipStrength
  size?: 72 | 120
}

const STRENGTH_TO_HEALTH: Record<RelationshipStrength, number> = {
  flourishing: 0.9,
  strong: 0.75,
  stable: 0.55,
  thinning: 0.35,
  decaying: 0.2,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default function ConnectionRing({ name, strength, size = 72 }: ConnectionRingProps) {
  const health = strength ? STRENGTH_TO_HEALTH[strength] : 0.5

  const ringColor = health > 0.6 ? '#5F7A6A' : health > 0.3 ? '#E3B873' : '#C46A4A'
  const outerColor = health > 0.6 ? '#2F4C5F' : ringColor
  const ringOpacity = 0.25 + health * 0.55
  const outerRingOpacity = 0.15 + health * 0.3

  // Inner ring: radius is size/2 - 10, circumference = 2*PI*r
  const innerRadius = size / 2 - 10
  const innerCircumference = 2 * Math.PI * innerRadius
  const innerFilled = health * innerCircumference
  const innerGap = (1 - health) * innerCircumference

  // Outer ring: radius is size/2 - 4, circumference = 2*PI*r
  const outerRadius = size / 2 - 4
  const outerCircumference = 2 * Math.PI * outerRadius
  const outerHealth = Math.max(0, health - 0.1)
  const outerFilled = outerHealth * outerCircumference
  const outerGap = (1 - outerHealth) * outerCircumference

  // Center circle
  const centerSize = size - 24
  const initials = getInitials(name)
  const fontSize = size === 120 ? 'text-[32px]' : 'text-[14px]'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute top-0 left-0 -rotate-90"
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
          opacity={outerRingOpacity}
          className="transition-all duration-deliberate ease-calm"
        />
        {/* Inner ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke={ringColor}
          strokeWidth="2.5"
          strokeDasharray={`${innerFilled} ${innerGap}`}
          strokeLinecap="round"
          opacity={ringOpacity}
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
