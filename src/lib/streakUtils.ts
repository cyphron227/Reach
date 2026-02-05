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

// ============================================================
// Habit Engine v2 Streak Functions
// ============================================================

import { VALID_DAY_THRESHOLD } from '@/types/habitEngine'

// Type for streak with v2 fields (not yet in generated types)
interface StreakWithV2 extends UserStreak {
  valid_days_streak_v2?: number
  longest_valid_days_v2?: number
}

// Type for habit log query result
interface HabitLogRecord {
  log_date: string
  is_valid_day: boolean
}

/**
 * Update the v2 valid days streak based on habit log
 * A valid day requires total_weight >= 0.5
 */
export async function updateValidDaysStreakV2(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
  isValidDay: boolean
): Promise<{ validDaysStreak: number; longestValidDays: number }> {
  const streak = await getOrCreateUserStreak(supabase, userId) as StreakWithV2

  // Get current v2 streak values (default to 0 if not set)
  let currentValidDaysStreak = streak.valid_days_streak_v2 || 0
  let longestValidDays = streak.longest_valid_days_v2 || 0

  if (!isValidDay) {
    // Not a valid day - don't update streak
    return { validDaysStreak: currentValidDaysStreak, longestValidDays }
  }

  // Check if this is consecutive with previous valid day
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: previousLog } = await (supabase as unknown as { from: (t: string) => any })
    .from('daily_habit_log')
    .select('log_date, is_valid_day')
    .eq('user_id', userId)
    .lt('log_date', logDate)
    .order('log_date', { ascending: false })
    .limit(1)
    .single() as { data: HabitLogRecord | null }

  if (!previousLog) {
    // First valid day ever
    currentValidDaysStreak = 1
  } else {
    const daysSincePrevious = daysBetween(previousLog.log_date, logDate)

    if (daysSincePrevious === 1 && previousLog.is_valid_day) {
      // Consecutive valid day - increment
      currentValidDaysStreak += 1
    } else if (daysSincePrevious === 0) {
      // Same day - already counted
    } else {
      // Gap in valid days - restart streak
      currentValidDaysStreak = 1
    }
  }

  // Update longest if current exceeds it
  if (currentValidDaysStreak > longestValidDays) {
    longestValidDays = currentValidDaysStreak
  }

  // Update user_streaks with v2 values
  await supabase
    .from('user_streaks')
    .update({
      valid_days_streak_v2: currentValidDaysStreak,
      longest_valid_days_v2: longestValidDays,
    })
    .eq('user_id', userId)

  return { validDaysStreak: currentValidDaysStreak, longestValidDays }
}

/**
 * Get the user's current valid days streak (v2)
 */
export async function getValidDaysStreakV2(
  supabase: SupabaseClient,
  userId: string
): Promise<{ validDaysStreak: number; longestValidDays: number; lastValidDate: string | null }> {
  const { data: streak } = await supabase
    .from('user_streaks')
    .select('valid_days_streak_v2, longest_valid_days_v2')
    .eq('user_id', userId)
    .single()

  // Get the last valid day date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastValidLog } = await (supabase as unknown as { from: (t: string) => any })
    .from('daily_habit_log')
    .select('log_date')
    .eq('user_id', userId)
    .eq('is_valid_day', true)
    .order('log_date', { ascending: false })
    .limit(1)
    .single() as { data: { log_date: string } | null }

  const streakData = streak as StreakWithV2 | null
  return {
    validDaysStreak: streakData?.valid_days_streak_v2 || 0,
    longestValidDays: streakData?.longest_valid_days_v2 || 0,
    lastValidDate: lastValidLog?.log_date || null,
  }
}

/**
 * Check if the valid days streak is at risk (no valid day logged today)
 */
export function isValidDaysStreakAtRisk(
  currentStreak: number,
  lastValidDate: string | null
): boolean {
  if (currentStreak === 0) return false
  if (!lastValidDate) return false

  const today = getToday()
  return lastValidDate !== today
}

/**
 * Get v2 streak status message
 */
export function getValidDaysStreakMessage(
  validDaysStreak: number,
  lastValidDate: string | null,
  todayProgress: number
): string {
  const today = getToday()
  const isValidToday = todayProgress >= VALID_DAY_THRESHOLD

  if (validDaysStreak === 0) {
    if (todayProgress > 0) {
      const remaining = VALID_DAY_THRESHOLD - todayProgress
      return `${remaining.toFixed(1)} more points to start your streak!`
    }
    return 'Log an action to start your streak!'
  }

  if (isValidToday || lastValidDate === today) {
    const nextMilestone = getNextMilestone(validDaysStreak)
    if (nextMilestone) {
      const daysToNext = nextMilestone - validDaysStreak
      if (daysToNext <= 3) {
        return `${daysToNext} day${daysToNext === 1 ? '' : 's'} to ${nextMilestone}-day milestone!`
      }
    }
    return `${validDaysStreak} valid days and counting!`
  }

  // Streak at risk
  if (todayProgress > 0) {
    const remaining = VALID_DAY_THRESHOLD - todayProgress
    return `${remaining.toFixed(1)} more points to keep your streak!`
  }

  return 'Log an action to protect your streak!'
}

/**
 * Calculate rolling 7-day valid day count
 */
export async function getWeeklyValidDaysCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as unknown as { from: (t: string) => any })
    .from('daily_habit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_valid_day', true)
    .gte('log_date', weekAgoStr)

  return count || 0
}
