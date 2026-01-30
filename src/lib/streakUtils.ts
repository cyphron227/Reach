/**
 * Streak and achievement utility functions for Ringur
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { UserStreak, AchievementDefinition, UserAchievement } from '@/types/database'

// Streak milestone thresholds
export const STREAK_MILESTONES = [7, 30, 90, 180, 365]

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a date falls on a weekend (Friday, Saturday, or Sunday)
 */
function isWeekend(dateString: string): boolean {
  const day = new Date(dateString).getDay()
  return day === 0 || day === 5 || day === 6 // Sunday, Friday, Saturday
}

/**
 * Fetch or create user streak record
 */
export async function getOrCreateUserStreak(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStreak> {
  // Try to fetch existing streak
  const { data: existingStreak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existingStreak) {
    return existingStreak as UserStreak
  }

  // Create new streak record
  const { data: newStreak, error } = await supabase
    .from('user_streaks')
    .insert({
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_interaction_date: null,
      streak_started_at: null,
      freezes_used_this_week: 0,
      week_freeze_reset_date: getToday(),
    })
    .select()
    .single()

  if (error) throw error
  return newStreak as UserStreak
}

/**
 * Update user's daily streak after logging an interaction
 * Returns the new streak value and any newly unlocked achievements
 */
export async function updateDailyStreak(
  supabase: SupabaseClient,
  userId: string,
  interactionDate: string
): Promise<{ streak: UserStreak; newAchievements: AchievementDefinition[] }> {
  const streak = await getOrCreateUserStreak(supabase, userId)
  const today = getToday()
  const yesterday = getYesterday()

  let newCurrentStreak = streak.current_streak
  let newLongestStreak = streak.longest_streak
  let newStreakStartedAt = streak.streak_started_at
  let newFreezesUsed = streak.freezes_used_this_week
  let newWeekFreezeResetDate = streak.week_freeze_reset_date

  // Reset weekly freeze counter if needed
  if (daysBetween(streak.week_freeze_reset_date, today) >= 7) {
    newFreezesUsed = 0
    newWeekFreezeResetDate = today
  }

  // Calculate streak based on interaction date
  if (streak.last_interaction_date === null) {
    // First interaction ever - start streak
    newCurrentStreak = 1
    newStreakStartedAt = interactionDate
  } else if (interactionDate === streak.last_interaction_date) {
    // Already logged today - no change
  } else if (interactionDate === today || interactionDate === yesterday) {
    const lastDate = streak.last_interaction_date
    const daysSinceLast = daysBetween(lastDate, interactionDate)

    if (daysSinceLast === 0) {
      // Same day - no change
    } else if (daysSinceLast === 1) {
      // Consecutive day - increment streak
      newCurrentStreak = streak.current_streak + 1
    } else if (daysSinceLast === 2) {
      // Missed one day - check if we can use auto-freeze
      if (newFreezesUsed < 1) {
        // Use auto-freeze
        newFreezesUsed += 1
        newCurrentStreak = streak.current_streak + 1
      } else {
        // No freeze available - streak breaks
        newCurrentStreak = 1
        newStreakStartedAt = interactionDate
      }
    } else if (daysSinceLast <= 3 && isWeekend(lastDate)) {
      // Weekend flex - Fri-Sun counts as 3-day window
      newCurrentStreak = streak.current_streak + 1
    } else {
      // Streak broken
      newCurrentStreak = 1
      newStreakStartedAt = interactionDate
    }
  }

  // Update longest streak if current is higher
  if (newCurrentStreak > newLongestStreak) {
    newLongestStreak = newCurrentStreak
  }

  // Update the database
  const { data: updatedStreak, error } = await supabase
    .from('user_streaks')
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_interaction_date: interactionDate,
      streak_started_at: newStreakStartedAt,
      freezes_used_this_week: newFreezesUsed,
      week_freeze_reset_date: newWeekFreezeResetDate,
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error

  // Check for new streak achievements
  const newAchievements = await checkStreakAchievements(
    supabase,
    userId,
    newCurrentStreak
  )

  return {
    streak: updatedStreak as UserStreak,
    newAchievements,
  }
}

/**
 * Check and unlock streak-based achievements
 */
async function checkStreakAchievements(
  supabase: SupabaseClient,
  userId: string,
  currentStreak: number
): Promise<AchievementDefinition[]> {
  const newlyUnlocked: AchievementDefinition[] = []

  // Fetch streak achievement definitions
  const { data: achievements } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('category', 'streak')
    .eq('threshold_type', 'streak_days')

  if (!achievements) return newlyUnlocked

  for (const achievement of achievements) {
    if (currentStreak >= (achievement.threshold_value || 0)) {
      // Check if already unlocked
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .single()

      if (!existing) {
        // Unlock the achievement
        await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
          current_progress: currentStreak,
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        })

        newlyUnlocked.push(achievement as AchievementDefinition)
      }
    }
  }

  return newlyUnlocked
}

/**
 * Get the next streak milestone
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak < milestone) {
      return milestone
    }
  }
  return null
}

/**
 * Get days until next milestone
 */
export function getDaysToNextMilestone(currentStreak: number): number | null {
  const nextMilestone = getNextMilestone(currentStreak)
  if (nextMilestone === null) return null
  return nextMilestone - currentStreak
}

/**
 * Fetch user's unlocked achievements
 */
export async function getUserAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAchievement[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievement_definitions(*)
    `)
    .eq('user_id', userId)
    .eq('is_unlocked', true)
    .order('unlocked_at', { ascending: false })

  return (data || []) as UserAchievement[]
}

/**
 * Fetch all achievement definitions
 */
export async function getAchievementDefinitions(
  supabase: SupabaseClient
): Promise<AchievementDefinition[]> {
  const { data } = await supabase
    .from('achievement_definitions')
    .select('*')
    .order('category')
    .order('threshold_value')

  return (data || []) as AchievementDefinition[]
}

/**
 * Check if streak is at risk (no interaction logged today)
 */
export function isStreakAtRisk(streak: UserStreak): boolean {
  if (streak.current_streak === 0) return false

  const today = getToday()
  const lastInteraction = streak.last_interaction_date

  if (!lastInteraction) return false

  // If last interaction was not today, streak is at risk
  return lastInteraction !== today
}

/**
 * Get streak status message
 */
export function getStreakStatusMessage(streak: UserStreak): string {
  if (streak.current_streak === 0) {
    return 'Start your streak today!'
  }

  const today = getToday()
  const daysToMilestone = getDaysToNextMilestone(streak.current_streak)

  if (streak.last_interaction_date === today) {
    if (daysToMilestone === 1) {
      return 'One more day to your next milestone!'
    }
    if (daysToMilestone && daysToMilestone <= 3) {
      return `${daysToMilestone} days to your next milestone!`
    }
    return 'Keep it going!'
  }

  // Streak at risk
  if (streak.freezes_used_this_week < 1) {
    return 'Log a catch-up to keep your streak!'
  }

  return 'Your streak is at risk!'
}
