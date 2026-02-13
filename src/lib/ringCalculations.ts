import { RelationshipStrength, ActionTypeV2 } from '@/types/habitEngine'
import { CatchupFrequency } from '@/types/database'

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

// Per-contact color palettes — each contact gets a unique pair via name hash
const RING_PALETTES = [
  { inner: '#5F7A6A', outer: '#2F4C5F' }, // moss + inkblue (default)
  { inner: '#4A7A96', outer: '#2F4C5F' }, // teal + inkblue
  { inner: '#7A6A5F', outer: '#5F4C3A' }, // warm brown + deep brown
  { inner: '#6A5F7A', outer: '#4C3A5F' }, // lavender + deep purple
  { inner: '#7A5F6A', outer: '#5F3A4C' }, // rose + deep rose
  { inner: '#5F7A7A', outer: '#3A5F5F' }, // sage + deep teal
  { inner: '#6E8A5E', outer: '#3F5F3A' }, // forest + deep forest
  { inner: '#8A7A5E', outer: '#5F5040' }, // amber + deep amber
]

// Fading/warning palettes (used when thinning/decaying)
const FADING_PALETTES = [
  { inner: '#C46A4A', outer: '#8A4A35' }, // ember
  { inner: '#B5543A', outer: '#7A3A28' }, // terracotta
  { inner: '#C47A5A', outer: '#8A5540' }, // warm ember
]

/** Simple hash of a string to a number */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/** Get a unique color palette for a contact based on their name */
export function getContactPalette(name: string): { inner: string; outer: string } {
  const idx = hashString(name) % RING_PALETTES.length
  return RING_PALETTES[idx]
}

// Base fill from strength tier
const STRENGTH_BASE_FILL: Record<RelationshipStrength, number> = {
  flourishing: 92,
  strong: 78,
  stable: 58,
  thinning: 35,
  decaying: 18,
}

// Base inner opacity from strength tier
const STRENGTH_BASE_OPACITY: Record<RelationshipStrength, number> = {
  flourishing: 0.90,
  strong: 0.75,
  stable: 0.58,
  thinning: 0.42,
  decaying: 0.30,
}

/**
 * Derive a rough RelationshipStrength from days since last interaction
 * and catchup frequency. Used when connection_health_v2 has no rows.
 */
export function deriveStrengthFromRecency(
  daysSinceLastContact: number | null,
  frequency: CatchupFrequency,
): RelationshipStrength {
  if (daysSinceLastContact === null) return 'stable' // never contacted

  const frequencyDays: Record<CatchupFrequency, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
    biannually: 180,
    annually: 365,
  }
  const expected = frequencyDays[frequency]

  // Ratio of actual gap to expected frequency
  const ratio = daysSinceLastContact / expected

  if (ratio <= 0.5) return 'flourishing'  // well ahead of schedule
  if (ratio <= 1.0) return 'strong'       // on track
  if (ratio <= 1.5) return 'stable'       // slightly behind
  if (ratio <= 2.5) return 'thinning'     // noticeably overdue
  return 'decaying'                        // very overdue
}

/**
 * Calculate ring visualization based on BOTH strength AND recency.
 * Fuller, more opaque rings = frequent recent contact.
 * Thinner, more transparent rings = time has passed.
 * Each contact gets unique colors via name hash.
 */
export function calculateRingVisualization(
  strength: RelationshipStrength,
  daysSinceAction: number,
  decayStartedAt: string | null,
  contactName?: string,
): RingVisualization {
  const baseFill = STRENGTH_BASE_FILL[strength]
  const baseOpacity = STRENGTH_BASE_OPACITY[strength]

  // Recency boost: recent contact (0-7 days) adds up to +12% fill and +0.2 opacity
  const recencyRatio = daysSinceAction <= 7 ? 1 - daysSinceAction / 7 : 0
  const fillBoost = recencyRatio * 12
  const opacityBoost = recencyRatio * 0.2

  // Decay penalty: beyond 14 days, rings fade further
  const decayPenalty = daysSinceAction > 14 ? Math.min(15, (daysSinceAction - 14) * 0.5) : 0
  const opacityPenalty = daysSinceAction > 14 ? Math.min(0.15, (daysSinceAction - 14) * 0.005) : 0

  const fillPercent = Math.min(100, Math.max(8, baseFill + fillBoost - decayPenalty))
  const innerOpacity = Math.min(1, Math.max(0.2, baseOpacity + opacityBoost - opacityPenalty))
  const outerOpacity = innerOpacity * 0.55

  // Per-contact colors
  const isFading = strength === 'thinning' || strength === 'decaying'
  let innerColor: string
  let outerColor: string

  if (isFading && contactName) {
    // Fading contacts get warm warning colors (but still unique per person)
    const fadingIdx = hashString(contactName) % FADING_PALETTES.length
    innerColor = FADING_PALETTES[fadingIdx].inner
    outerColor = FADING_PALETTES[fadingIdx].outer
  } else if (contactName) {
    const palette = getContactPalette(contactName)
    innerColor = palette.inner
    outerColor = palette.outer
  } else {
    // Fallback if no name provided
    innerColor = '#5F7A6A'
    outerColor = '#2F4C5F'
  }

  // Pulse when decay has started and 3+ days without contact, OR very overdue
  const shouldPulse = (decayStartedAt !== null && daysSinceAction >= 3) || daysSinceAction >= 21

  const statusLabel =
    strength === 'flourishing' ? 'Flourishing' :
    strength === 'strong' ? 'Strong' :
    strength === 'stable' ? 'Stable' :
    strength === 'thinning' ? 'Needs attention' :
    'Fading'

  const isHealthy = strength === 'flourishing' || strength === 'strong'
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
    : daysSinceAction > 999
    ? 'No contact recorded yet.'
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
