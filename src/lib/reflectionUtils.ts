import { CatchupFrequency, Interaction, InteractionType } from '@/types/database'

export const frequencyToDays: Record<CatchupFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
}

export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export function getWeekDateRange(weekDate: string): { start: string; end: string } {
  const start = new Date(weekDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export function getDaysSince(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function formatRelativeDate(dateString: string): string {
  const days = getDaysSince(dateString)
  if (days === null) return ''
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return '1 month ago'
  return `${Math.floor(days / 30)} months ago`
}

export interface MaintenanceGap {
  gap: number
  status: 'ahead' | 'on_track' | 'behind' | 'overdue' | 'never_contacted'
  message: string
  progressPercent: number
}

export function calculateMaintenanceGap(
  lastInteractionDate: string | null,
  catchupFrequency: CatchupFrequency
): MaintenanceGap {
  const frequencyDays = frequencyToDays[catchupFrequency]
  const daysSince = getDaysSince(lastInteractionDate)

  if (daysSince === null) {
    return {
      gap: frequencyDays,
      status: 'never_contacted',
      message: "You haven't connected yet - reach out anytime!",
      progressPercent: 0
    }
  }

  const gap = daysSince - frequencyDays
  const progressPercent = Math.min(100, Math.max(0, (daysSince / frequencyDays) * 100))

  if (gap < -7) {
    return { gap, status: 'ahead', message: "You're ahead of schedule!", progressPercent }
  }
  if (gap <= 0) {
    return { gap, status: 'on_track', message: 'On track with your connection goal', progressPercent }
  }
  if (gap <= 7) {
    return { gap, status: 'behind', message: `${gap} days behind - time to reach out`, progressPercent: 100 }
  }
  return { gap, status: 'overdue', message: `${gap} days overdue - they'd love to hear from you!`, progressPercent: 100 }
}

export interface SuggestedAction {
  type: InteractionType
  emoji: string
  message: string
  scienceNote: string
  priority: 'high' | 'medium' | 'low'
}

export function generateSuggestions(interactions: Interaction[]): SuggestedAction[] {
  const suggestions: SuggestedAction[] = []

  // Analyze interaction type patterns
  const typeFrequency: Record<InteractionType, number> = {
    call: 0,
    text: 0,
    in_person: 0,
    other: 0
  }

  const recentInteractions = interactions.filter(i => {
    const days = getDaysSince(i.interaction_date)
    return days !== null && days < 90
  })

  for (const interaction of recentInteractions) {
    typeFrequency[interaction.interaction_type]++
  }

  // Check for recent in-person (within 30 days)
  const recentInPerson = interactions.some(i => {
    const days = getDaysSince(i.interaction_date)
    return i.interaction_type === 'in_person' && days !== null && days < 30
  })

  if (!recentInPerson) {
    suggestions.push({
      type: 'in_person',
      emoji: '🤝',
      message: 'Schedule a face-to-face catch-up',
      scienceNote: 'In-person interactions build deeper trust and connection than digital ones',
      priority: 'high'
    })
  }

  // Check if mostly texting recently
  const recentTexts = interactions.filter(i => {
    const days = getDaysSince(i.interaction_date)
    return i.interaction_type === 'text' && days !== null && days < 14
  }).length

  if (recentTexts >= 2 && typeFrequency.call < typeFrequency.text) {
    suggestions.push({
      type: 'call',
      emoji: '📞',
      message: 'Try a quick phone call',
      scienceNote: 'Voice calls convey emotional nuance that texts cannot capture',
      priority: 'medium'
    })
  }

  // Suggest variety if pattern is repetitive
  const totalRecent = Object.values(typeFrequency).reduce((a, b) => a + b, 0)
  if (totalRecent > 3) {
    const dominantType = Object.entries(typeFrequency)
      .filter(([type]) => type !== 'other')
      .sort(([, a], [, b]) => b - a)[0]

    if (dominantType && dominantType[1] > totalRecent * 0.7) {
      const leastUsed = Object.entries(typeFrequency)
        .filter(([type]) => type !== 'other' && type !== dominantType[0])
        .sort(([, a], [, b]) => a - b)[0]

      if (leastUsed) {
        const typeLabels: Record<InteractionType, string> = {
          call: 'a phone call',
          text: 'a text message',
          in_person: 'meeting up in person',
          other: 'something different'
        }
        const typeEmojis: Record<InteractionType, string> = {
          call: '📞',
          text: '💬',
          in_person: '🤝',
          other: '✨'
        }
        suggestions.push({
          type: leastUsed[0] as InteractionType,
          emoji: typeEmojis[leastUsed[0] as InteractionType],
          message: `Try ${typeLabels[leastUsed[0] as InteractionType]}`,
          scienceNote: 'Varying communication methods strengthens relationship resilience',
          priority: 'low'
        })
      }
    }
  }

  return suggestions.slice(0, 3)
}

export interface ReflectionStreak {
  currentStreak: number
  longestStreak: number
  totalReflections: number
}

export function calculateReflectionStreak(
  reflections: { week_date: string }[]
): ReflectionStreak {
  if (reflections.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalReflections: 0 }
  }

  // Sort by week_date descending
  const sorted = [...reflections].sort((a, b) =>
    new Date(b.week_date).getTime() - new Date(a.week_date).getTime()
  )

  const currentWeek = getWeekStartDate()
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let expectedWeek = new Date(currentWeek)

  for (const reflection of sorted) {
    const reflectionWeek = new Date(reflection.week_date)
    reflectionWeek.setHours(0, 0, 0, 0)
    expectedWeek.setHours(0, 0, 0, 0)

    const weekDiff = Math.round((expectedWeek.getTime() - reflectionWeek.getTime()) / (7 * 24 * 60 * 60 * 1000))

    if (weekDiff === 0) {
      tempStreak++
      expectedWeek.setDate(expectedWeek.getDate() - 7)
    } else if (weekDiff === 1) {
      // Allow for current week not completed yet
      tempStreak++
      expectedWeek = new Date(reflectionWeek)
      expectedWeek.setDate(expectedWeek.getDate() - 7)
    } else {
      // Gap in streak
      if (tempStreak > longestStreak) longestStreak = tempStreak
      if (currentStreak === 0) currentStreak = tempStreak
      tempStreak = 1
      expectedWeek = new Date(reflectionWeek)
      expectedWeek.setDate(expectedWeek.getDate() - 7)
    }
  }

  if (tempStreak > longestStreak) longestStreak = tempStreak
  if (currentStreak === 0) currentStreak = tempStreak

  return {
    currentStreak,
    longestStreak,
    totalReflections: reflections.length
  }
}
