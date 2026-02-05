/**
 * Feature Flags Utility
 *
 * Provides client-side feature flag checking for gradual rollout
 * of Habit Engine v1 features.
 *
 * Flags default to OFF, so if the database is unavailable or there's
 * an error, the app falls back to v1 behavior.
 */

import { createClient } from '@/lib/supabase/client'
import { FeatureFlag, FeatureFlagId } from '@/types/habitEngine'

// Cache for feature flags to avoid repeated database calls
let flagsCache: Map<string, FeatureFlag> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Clear the feature flags cache
 * Call this when you need to force a refresh
 */
export function clearFeatureFlagsCache(): void {
  flagsCache = null
  cacheTimestamp = 0
}

/**
 * Fetch all feature flags from the database
 * Results are cached for 5 minutes
 */
async function fetchFeatureFlags(): Promise<Map<string, FeatureFlag>> {
  const now = Date.now()

  // Return cached flags if still valid
  if (flagsCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return flagsCache
  }

  try {
    // Note: Uses type assertion for new table not yet in Supabase type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as { from: (table: string) => any }
    const { data, error } = await supabase.from('feature_flags').select('*')

    if (error) {
      console.error('[FeatureFlags] Error fetching feature flags:', error)
      // Return empty map on error - all flags will default to OFF
      return new Map()
    }

    // Build cache
    flagsCache = new Map()
    for (const flag of (data || []) as FeatureFlag[]) {
      flagsCache.set(flag.id, flag)
    }
    cacheTimestamp = now

    return flagsCache
  } catch (err) {
    console.error('[FeatureFlags] Failed to fetch feature flags:', err)
    return new Map()
  }
}

/**
 * Check if a feature flag is enabled for a user
 *
 * Checks in order:
 * 1. If flag is globally enabled (is_enabled = true)
 * 2. If user is in enabled_for_users list
 * 3. If user falls within rollout_percentage
 *
 * @param flagId - The feature flag ID to check
 * @param userId - Optional user ID for user-specific checks
 * @returns true if the feature is enabled, false otherwise
 */
export async function isFeatureEnabled(
  flagId: FeatureFlagId,
  userId?: string
): Promise<boolean> {
  try {
    const flags = await fetchFeatureFlags()
    const flag = flags.get(flagId)

    // Flag not found - default to OFF
    if (!flag) {
      return false
    }

    // Globally enabled
    if (flag.is_enabled) {
      return true
    }

    // Check user-specific enablement
    if (userId) {
      // Check if user is in enabled_for_users list
      if (flag.enabled_for_users?.includes(userId)) {
        return true
      }

      // Check rollout percentage
      if (flag.rollout_percentage > 0) {
        // Deterministic rollout based on user ID hash
        // This ensures the same user always gets the same result
        const hash = hashUserId(userId)
        return hash < flag.rollout_percentage
      }
    }

    return false
  } catch (err) {
    console.error('[FeatureFlags] Error checking feature flag:', err)
    return false // Default to OFF on error
  }
}

/**
 * Check multiple feature flags at once
 * More efficient than calling isFeatureEnabled multiple times
 */
export async function checkFeatureFlags(
  flagIds: FeatureFlagId[],
  userId?: string
): Promise<Record<FeatureFlagId, boolean>> {
  const result: Record<string, boolean> = {}

  try {
    const flags = await fetchFeatureFlags()

    for (const flagId of flagIds) {
      const flag = flags.get(flagId)

      if (!flag) {
        result[flagId] = false
        continue
      }

      if (flag.is_enabled) {
        result[flagId] = true
        continue
      }

      if (userId) {
        if (flag.enabled_for_users?.includes(userId)) {
          result[flagId] = true
          continue
        }

        if (flag.rollout_percentage > 0) {
          const hash = hashUserId(userId)
          result[flagId] = hash < flag.rollout_percentage
          continue
        }
      }

      result[flagId] = false
    }
  } catch (err) {
    console.error('Error checking feature flags:', err)
    // Default all to OFF on error
    for (const flagId of flagIds) {
      result[flagId] = false
    }
  }

  return result as Record<FeatureFlagId, boolean>
}

/**
 * Hash a user ID to a number between 0-99 for percentage rollout
 * This is deterministic so the same user always gets the same hash
 */
function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // Convert to 0-99 range
  return Math.abs(hash % 100)
}

/**
 * React hook helper - check if habit engine is enabled
 * Returns null while loading, then the actual value
 */
export async function isHabitEngineEnabled(userId?: string): Promise<boolean> {
  return isFeatureEnabled('habit_engine_v1', userId)
}

/**
 * Get all Habit Engine v1 related flags at once
 */
export async function getHabitEngineFlags(userId?: string): Promise<{
  habitEngine: boolean
  strengthV2: boolean
  ringStructure: boolean
  escalationLadder: boolean
  patternReviews: boolean
  replacementMechanism: boolean
}> {
  const flags = await checkFeatureFlags(
    [
      'habit_engine_v1',
      'relationship_strength_v2',
      'ring_structure',
      'escalation_ladder',
      'weekly_pattern_reviews',
      'replacement_mechanism',
    ],
    userId
  )

  return {
    habitEngine: flags.habit_engine_v1,
    strengthV2: flags.relationship_strength_v2,
    ringStructure: flags.ring_structure,
    escalationLadder: flags.escalation_ladder,
    patternReviews: flags.weekly_pattern_reviews,
    replacementMechanism: flags.replacement_mechanism,
  }
}
