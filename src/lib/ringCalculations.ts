import { RelationshipStrength, ActionTypeV2 } from '@/types/habitEngine'

export interface RingVisualization {
  fillPercent: number
  innerOpacity: number
  outerOpacity: number
  innerColor: string
  outerColor: string
  shouldPulse: boolean
  statusLabel: string
  strengthClass: 'healthy' | 'moderate' | 'fading'
}

// Base fill from strength tier
const STRENGTH_BASE_FILL: Record<RelationshipStrength, number> = {
  flourishing: 90,
  strong: 75,
  stable: 55,
  thinning: 35,
  decaying: 20,
}

// Base inner opacity from strength tier
const STRENGTH_BASE_OPACITY: Record<RelationshipStrength, number> = {
  flourishing: 0.80,
  strong: 0.70,
  stable: 0.55,
  thinning: 0.45,
  decaying: 0.35,
}

/**
 * Calculate ring visualization based on BOTH strength AND recency.
 * Fuller, more opaque rings = frequent recent contact.
 * Thinner, more transparent rings = time has passed.
 */
export function calculateRingVisualization(
  strength: RelationshipStrength,
  daysSinceAction: number,
  decayStartedAt: string | null,
): RingVisualization {
  const baseFill = STRENGTH_BASE_FILL[strength]
  const baseOpacity = STRENGTH_BASE_OPACITY[strength]

  // Recency boost: recent contact (0-7 days) adds up to +10% fill and +0.2 opacity
  const recencyRatio = daysSinceAction <= 7 ? 1 - daysSinceAction / 7 : 0
  const fillBoost = recencyRatio * 10
  const opacityBoost = recencyRatio * 0.2

  const fillPercent = Math.min(100, baseFill + fillBoost)
  const innerOpacity = Math.min(1, baseOpacity + opacityBoost)
  const outerOpacity = innerOpacity * 0.55

  // Color based on strength
  const isHealthy = strength === 'flourishing' || strength === 'strong'
  const isFading = strength === 'thinning' || strength === 'decaying'

  const innerColor = isHealthy ? '#5F7A6A' : isFading ? '#C46A4A' : '#E3B873'
  const outerColor = isHealthy ? '#2F4C5F' : innerColor

  // Pulse when decay has started and 3+ days without contact
  const shouldPulse = decayStartedAt !== null && daysSinceAction >= 3

  const statusLabel =
    strength === 'flourishing' ? 'Flourishing' :
    strength === 'strong' ? 'Strong' :
    strength === 'stable' ? 'Stable' :
    strength === 'thinning' ? 'Needs attention' :
    'Fading'

  const strengthClass: RingVisualization['strengthClass'] =
    isHealthy ? 'healthy' : isFading ? 'fading' : 'moderate'

  return { fillPercent, innerOpacity, outerOpacity, innerColor, outerColor, shouldPulse, statusLabel, strengthClass }
}

/**
 * Generate a human-readable description for the ring status dialog.
 */
export function getRingStatusDescription(
  strength: RelationshipStrength,
  daysSinceAction: number,
  lastActionType: ActionTypeV2 | null,
  decayStartedAt: string | null,
): string {
  const actionVerb =
    lastActionType === 'text' ? 'messaged' :
    lastActionType === 'call' ? 'called' :
    lastActionType === 'in_person_1on1' ? 'met' :
    'connected with them'

  const timeText =
    daysSinceAction === 0 ? 'today' :
    daysSinceAction === 1 ? 'yesterday' :
    daysSinceAction < 7 ? `${daysSinceAction} days ago` :
    daysSinceAction < 14 ? 'last week' :
    daysSinceAction < 30 ? `${Math.floor(daysSinceAction / 7)} weeks ago` :
    `${Math.floor(daysSinceAction / 30)} months ago`

  const lastContactLine = lastActionType
    ? `You ${actionVerb} ${timeText}.`
    : daysSinceAction === 0
    ? 'You were in touch today.'
    : `Last contact was ${timeText}.`

  if (strength === 'flourishing') {
    return `${lastContactLine} This connection is thriving — frequent, meaningful contact keeps the ring full and bright.`
  }
  if (strength === 'strong') {
    return `${lastContactLine} A strong connection. Keep showing up and the rings stay full.`
  }
  if (strength === 'stable') {
    return `${lastContactLine} Steady but there's room to deepen. More regular contact will fill the rings further.`
  }
  if (strength === 'thinning') {
    const decayDays = decayStartedAt
      ? Math.floor((Date.now() - new Date(decayStartedAt).getTime()) / 86400000)
      : daysSinceAction
    return `${lastContactLine} This connection has been thinning for ${decayDays} day${decayDays !== 1 ? 's' : ''}. Reaching out now makes a real difference.`
  }
  // decaying
  return `${lastContactLine} The connection is fading. Even a short message can reverse this — the rings respond quickly to contact.`
}
