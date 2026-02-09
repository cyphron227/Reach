/**
 * Habit Engine V1 Utility Functions
 *
 * Core logic for the Habit Engine v1 features including:
 * - Action weight calculations
 * - Relationship strength decay
 * - Escalation nudges
 * - Weekly pattern analysis
 */

import { InteractionType } from '@/types/database'
import {
  ActionTypeV2,
  ACTION_WEIGHTS,
  RelationshipStrength,
  DECAY_THRESHOLDS,
  DailyAction,
  WeeklyPatternData,
  SuggestedAction,
  INSIGHT_MESSAGES,
  ESCALATION_LADDER,
} from '@/types/habitEngine'

// ============================================================================
// ACTION WEIGHT FUNCTIONS
// ============================================================================

/**
 * Map legacy interaction type to new action type
 * Used for backwards compatibility with existing interactions
 */
export function mapLegacyInteractionType(type: InteractionType): ActionTypeV2 {
  switch (type) {
    case 'text':
      return 'text'
    case 'call':
      return 'call'
    case 'in_person':
      return 'in_person_1on1'
    case 'other':
      return 'text' // Conservative default
  }
}

/**
 * Get the weight for an action type
 */
export function getActionWeight(actionType: ActionTypeV2): number {
  return ACTION_WEIGHTS[actionType]
}

/**
 * Check if a day is valid (any social investment action with weight >= 1)
 */
export function isValidDay(totalWeight: number): boolean {
  return totalWeight >= 1
}

/**
 * Calculate total weight from a list of actions
 */
export function calculateTotalWeight(actions: DailyAction[]): number {
  return actions.reduce((sum, action) => sum + action.action_weight, 0)
}

/**
 * Find the highest weighted action type from a list of actions
 */
export function findHighestAction(actions: DailyAction[]): ActionTypeV2 | null {
  if (actions.length === 0) return null

  let highest: DailyAction | null = null
  for (const action of actions) {
    if (!highest || action.action_weight > highest.action_weight) {
      highest = action
    }
  }
  return highest?.action_type ?? null
}

// ============================================================================
// RELATIONSHIP STRENGTH FUNCTIONS
// ============================================================================

/**
 * Calculate relationship strength based on days since last action
 *
 * Decay logic:
 * - 0-2 days: Can improve to flourishing
 * - 3+ days: Start thinning signal
 * - 7+ days: Weakening
 * - 14+ days: Erosion
 * - 30+ days: Full decay state
 */
export function calculateRelationshipStrength(
  daysSinceAction: number | null,
  currentStrength: RelationshipStrength
): RelationshipStrength {
  // Never contacted - default to stable
  if (daysSinceAction === null) {
    return 'stable'
  }

  // Recent action - can improve
  if (daysSinceAction <= 2) {
    // Progress upward
    if (currentStrength === 'decaying') return 'thinning'
    if (currentStrength === 'thinning') return 'stable'
    if (currentStrength === 'stable') return 'strong'
    if (currentStrength === 'strong') return 'flourishing'
    return 'flourishing'
  }

  // Check decay thresholds
  if (daysSinceAction >= DECAY_THRESHOLDS.decay_state) {
    return 'decaying'
  }

  if (daysSinceAction >= DECAY_THRESHOLDS.erosion) {
    // Significant erosion - at least thinning
    if (currentStrength === 'flourishing' || currentStrength === 'strong') {
      return 'thinning'
    }
    return currentStrength === 'stable' ? 'thinning' : currentStrength
  }

  if (daysSinceAction >= DECAY_THRESHOLDS.weakening) {
    // Weakening - step down one level
    if (currentStrength === 'flourishing') return 'strong'
    if (currentStrength === 'strong') return 'stable'
    if (currentStrength === 'stable') return 'thinning'
    return currentStrength
  }

  if (daysSinceAction >= DECAY_THRESHOLDS.thinning_signal) {
    // Slight warning but don't change state yet (unless already flourishing)
    if (currentStrength === 'flourishing') return 'strong'
    return currentStrength
  }

  return currentStrength
}

/**
 * Check if a connection is in pending action state (30+ days in decay)
 */
export function isPendingAction(
  daysSinceAction: number | null,
  currentStrength: RelationshipStrength
): boolean {
  return (
    currentStrength === 'decaying' &&
    daysSinceAction !== null &&
    daysSinceAction >= DECAY_THRESHOLDS.decay_state
  )
}

/**
 * Get a human-readable decay status message
 */
export function getDecayStatusMessage(
  daysSinceAction: number | null,
  strength: RelationshipStrength
): string {
  if (daysSinceAction === null) {
    return 'Never connected'
  }

  if (strength === 'flourishing') {
    return 'Connection is flourishing'
  }

  if (strength === 'decaying') {
    return INSIGHT_MESSAGES.decay_warning
  }

  if (daysSinceAction >= DECAY_THRESHOLDS.weakening) {
    return `${daysSinceAction} days since last connection`
  }

  return 'Connection is healthy'
}

// ============================================================================
// ESCALATION LADDER FUNCTIONS
// ============================================================================

/**
 * Get escalation nudge suggestion
 * Never blocks low-effort actions, always rewards escalation
 */
export function getEscalationNudge(
  lastActionType: ActionTypeV2 | null,
  lastNudgeLevel: number
): { level: number; suggestion: string; actionType: ActionTypeV2 } | null {
  // Never block - only suggest
  if (lastNudgeLevel >= 3) {
    return null // Already at max
  }

  const nextLevel = Math.min(lastNudgeLevel + 1, 3)
  const escalation = ESCALATION_LADDER.find((e) => e.level === nextLevel)

  if (!escalation) return null

  return {
    level: escalation.level,
    suggestion: escalation.suggestion,
    actionType: escalation.action_type,
  }
}

/**
 * Get escalation message based on current action type
 */
export function getEscalationMessage(currentActionType: ActionTypeV2): string | null {
  const weight = ACTION_WEIGHTS[currentActionType]

  if (weight <= 1) {
    return INSIGHT_MESSAGES.text_to_call
  }

  if (weight <= 3) {
    return INSIGHT_MESSAGES.call_to_inperson
  }

  return null // Already at high depth
}

// ============================================================================
// WEEKLY PATTERN ANALYSIS
// ============================================================================

/**
 * Calculate weekly pattern insights from daily actions
 */
export function analyzeWeeklyPattern(
  actions: DailyAction[],
  previousWeekActions: DailyAction[] = []
): WeeklyPatternData {
  const actionCounts: Record<ActionTypeV2, number> = {
    text: 0,
    call: 0,
    in_person_1on1: 0,
  }

  let totalWeight = 0
  for (const action of actions) {
    actionCounts[action.action_type]++
    totalWeight += action.action_weight
  }

  // Find dominant type
  const sortedTypes = Object.entries(actionCounts).sort(([, a], [, b]) => b - a)
  const dominant = sortedTypes[0]

  // Calculate depth score (higher weight actions = more depth)
  const highDepthActions = actions.filter(
    (a) =>
      a.action_type === 'call' ||
      a.action_type === 'in_person_1on1'
  )
  const depthScore = Math.min(
    100,
    Math.round((highDepthActions.length / Math.max(1, actions.length)) * 100)
  )

  // Calculate variety score (unique action types used)
  const uniqueTypes = Object.values(actionCounts).filter((c) => c > 0).length
  const varietyScore = Math.min(100, Math.round((uniqueTypes / 3) * 100))

  // Calculate consistency score (actions spread across days)
  const uniqueDays = new Set(actions.map((a) => a.action_date)).size
  const consistencyScore = Math.min(100, Math.round((uniqueDays / 7) * 100))

  // Calculate previous week total for comparison
  const previousWeekWeight = previousWeekActions.reduce((s, a) => s + a.action_weight, 0)

  // Determine insight type and message
  let insightType: WeeklyPatternData['insight_type'] = 'consistent'
  let insightMessage = INSIGHT_MESSAGES.consistent

  if (depthScore < 30 && actions.length >= 3) {
    insightType = 'contact_not_depth'
    insightMessage = INSIGHT_MESSAGES.contact_not_depth
  } else if (depthScore >= 60) {
    insightType = 'good_depth'
    insightMessage = INSIGHT_MESSAGES.good_depth
  } else if (consistencyScore < 30) {
    insightType = 'sporadic'
    insightMessage = INSIGHT_MESSAGES.sporadic
  } else if (previousWeekWeight > 0 && totalWeight > previousWeekWeight * 1.2) {
    insightType = 'escalating'
    insightMessage = INSIGHT_MESSAGES.escalating
  }

  return {
    dominant_action_type: dominant && dominant[1] > 0 ? (dominant[0] as ActionTypeV2) : null,
    depth_score: depthScore,
    variety_score: varietyScore,
    consistency_score: consistencyScore,
    insight_type: insightType,
    insight_message: insightMessage,
  }
}

/**
 * Generate suggested actions based on weekly patterns and connection health
 */
export function generateSuggestedActions(
  patterns: WeeklyPatternData,
  connections: Array<{
    id: string
    name: string
    strength: RelationshipStrength
    lastActionType: ActionTypeV2 | null
    daysSinceAction: number | null
  }>
): SuggestedAction[] {
  const suggestions: SuggestedAction[] = []

  // Sort connections by need (decaying first, then thinning)
  const sortedConnections = [...connections].sort((a, b) => {
    const strengthOrder: Record<RelationshipStrength, number> = {
      decaying: 0,
      thinning: 1,
      stable: 2,
      strong: 3,
      flourishing: 4,
    }
    return strengthOrder[a.strength] - strengthOrder[b.strength]
  })

  // Suggest actions for struggling connections
  for (const conn of sortedConnections.slice(0, 3)) {
    if (conn.strength === 'decaying' || conn.strength === 'thinning') {
      const nudge = getEscalationNudge(conn.lastActionType, 0)
      if (nudge) {
        suggestions.push({
          action_type: nudge.actionType,
          target_connection_id: conn.id,
          target_connection_name: conn.name,
          reason: conn.strength === 'decaying' ? 'Relationship needs attention' : 'Prevent decay',
          priority: conn.strength === 'decaying' ? 'high' : 'medium',
        })
      }
    }
  }

  // If depth is low, suggest higher-depth actions
  if (patterns.depth_score < 40) {
    suggestions.push({
      action_type: 'call',
      reason: INSIGHT_MESSAGES.text_to_call,
      priority: 'medium',
    })
  }

  // If variety is low, suggest trying different action types
  if (patterns.variety_score < 30) {
    const unusedHighValue: ActionTypeV2[] = ['call', 'in_person_1on1']
    const dominant = patterns.dominant_action_type

    for (const actionType of unusedHighValue) {
      if (actionType !== dominant) {
        suggestions.push({
          action_type: actionType,
          reason: 'Try varying your connection methods',
          priority: 'low',
        })
        break
      }
    }
  }

  return suggestions.slice(0, 5) // Limit to 5 suggestions
}

// ============================================================================
// STREAK FUNCTIONS (V2)
// ============================================================================

/**
 * Calculate valid days streak from daily habit logs
 */
export function calculateValidDaysStreak(
  logs: Array<{ log_date: string; is_valid_day: boolean }>
): number {
  if (logs.length === 0) return 0

  // Sort by date descending
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  )

  let streak = 0
  let expectedDate = new Date()
  expectedDate.setHours(0, 0, 0, 0)

  for (const log of sortedLogs) {
    const logDate = new Date(log.log_date)
    logDate.setHours(0, 0, 0, 0)

    // Check if this is the expected date (or yesterday if we haven't logged today yet)
    const daysDiff = Math.floor(
      (expectedDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff > 1) {
      // Gap in streak
      break
    }

    if (log.is_valid_day) {
      streak++
      expectedDate = new Date(logDate)
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      // Invalid day breaks streak
      break
    }
  }

  return streak
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get the Monday of the current week
 */
export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

/**
 * Calculate days since a given date
 */
export function daysSince(dateString: string | null): number | null {
  if (!dateString) return null

  const date = new Date(dateString)
  const now = new Date()

  // Reset times to midnight for accurate day calculation
  date.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
