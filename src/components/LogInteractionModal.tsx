'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, InteractionType, AchievementDefinition, ActionTypeV2, ACTION_WEIGHTS } from '@/types/database'
import { getWeekStartDate } from '@/lib/reflectionUtils'
import { cancelConnectionNotification } from '@/lib/capacitor'
import { updateDailyStreak } from '@/lib/streakUtils'
import { useScrollLock } from '@/lib/useScrollLock'

interface LogInteractionModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onSuccess: (newAchievements?: AchievementDefinition[]) => void
  defaultInteractionType?: InteractionType
}

type Mood = 'happy' | 'neutral' | 'sad'

const interactionTypes: { value: ActionTypeV2; legacyType: InteractionType; label: string; icon: string }[] = [
  { value: 'text', legacyType: 'text', label: 'Message', icon: '💬' },
  { value: 'call', legacyType: 'call', label: 'Call', icon: '📞' },
  { value: 'in_person_1on1', legacyType: 'in_person', label: 'In-person', icon: '🤝' },
]

const moodOptions: { value: Mood; emoji: string }[] = [
  { value: 'happy', emoji: '😊' },
  { value: 'neutral', emoji: '😐' },
  { value: 'sad', emoji: '😔' },
]

// Helper to update daily habit log aggregation
// Note: Uses 'any' type for new tables not yet in Supabase type definitions
async function updateDailyHabitLog(userId: string, date: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as unknown as { from: (table: string) => any }

  // Get all actions for this day
  const { data: actions } = await supabase
    .from('daily_actions')
    .select('action_type, action_weight')
    .eq('user_id', userId)
    .eq('action_date', date)

  if (!actions) return

  const totalWeight = (actions as Array<{ action_type: string; action_weight: number }>)
    .reduce((sum, a) => sum + Number(a.action_weight), 0)
  const actionCount = actions.length

  // Find highest action
  let highestAction: ActionTypeV2 | null = null
  let highestWeight = 0
  for (const action of actions as Array<{ action_type: string; action_weight: number }>) {
    if (Number(action.action_weight) > highestWeight) {
      highestWeight = Number(action.action_weight)
      highestAction = action.action_type as ActionTypeV2
    }
  }

  // Upsert the daily habit log
  await supabase
    .from('daily_habit_log')
    .upsert({
      user_id: userId,
      log_date: date,
      total_weight: totalWeight,
      action_count: actionCount,
      highest_action: highestAction,
    }, {
      onConflict: 'user_id,log_date',
    })
}

export default function LogInteractionModal({ connection, isOpen, onClose, onSuccess, defaultInteractionType }: LogInteractionModalProps) {
  const defaultV2 = defaultInteractionType === 'in_person' ? 'in_person_1on1'
    : defaultInteractionType === 'text' ? 'text'
    : 'call'

  const [actionType, setActionType] = useState<ActionTypeV2>(defaultV2)
  const [mood, setMood] = useState<Mood | null>(null)
  const [memory, setMemory] = useState('')
  const [interactionDate, setInteractionDate] = useState(new Date().toISOString().split('T')[0])
  const [planNextCatchup, setPlanNextCatchup] = useState(false)
  const [nextCatchupDate, setNextCatchupDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReflectionPriority, setIsReflectionPriority] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      checkReflectionPriority()
      const v2 = defaultInteractionType === 'in_person' ? 'in_person_1on1'
        : defaultInteractionType === 'text' ? 'text'
        : 'call'
      setActionType(v2)
      setMood(null)
    }
  }, [isOpen, connection.id, defaultInteractionType])

  // Lock body scroll when modal is open
  useScrollLock(isOpen)

  const checkReflectionPriority = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const weekDate = getWeekStartDate()

    const { data: reflection } = await supabase
      .from('weekly_reflections')
      .select('grow_closer_id')
      .eq('user_id', user.id)
      .eq('week_date', weekDate)
      .single()

    setIsReflectionPriority(reflection?.grow_closer_id === connection.id)
  }

  // Get the legacy interaction type from V2 type
  const getLegacyType = (v2: ActionTypeV2): InteractionType => {
    const match = interactionTypes.find(t => t.value === v2)
    return match?.legacyType || 'other'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const legacyType = getLegacyType(actionType)

      // Create the interaction record
      const { data: interactionData, error: interactionError } = await supabase
        .from('interactions')
        .insert({
          connection_id: connection.id,
          user_id: user.id,
          interaction_type: legacyType,
          memory: memory || null,
          mood: mood,
          interaction_date: interactionDate,
          action_type_v2: actionType,
          action_weight_v2: ACTION_WEIGHTS[actionType],
        })
        .select('id')
        .single()

      if (interactionError) throw interactionError

      // Log to daily_actions table
      if (interactionData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabaseAny = supabase as unknown as { from: (table: string) => any }
        const { error: dailyActionError } = await supabaseAny
          .from('daily_actions')
          .insert({
            user_id: user.id,
            connection_id: connection.id,
            action_type: actionType,
            action_weight: ACTION_WEIGHTS[actionType],
            action_date: interactionDate,
            notes: memory || null,
            legacy_interaction_id: interactionData.id,
          })

        if (dailyActionError) {
          console.error('Failed to log daily action:', dailyActionError)
        }

        // Update daily habit log aggregation
        await updateDailyHabitLog(user.id, interactionDate)
      }

      // Update the connection's last_interaction_date and optionally next_catchup_date
      const updateData: { last_interaction_date: string; next_catchup_date?: string | null } = {
        last_interaction_date: interactionDate,
      }

      if (planNextCatchup && nextCatchupDate) {
        updateData.next_catchup_date = nextCatchupDate
      } else if (!planNextCatchup) {
        updateData.next_catchup_date = null
      }

      const { error: updateError } = await supabase
        .from('connections')
        .update(updateData)
        .eq('id', connection.id)

      if (updateError) throw updateError

      // Update reflection followup date if this is a reflection priority
      if (isReflectionPriority) {
        const weekDate = getWeekStartDate()
        await supabase
          .from('weekly_reflections')
          .update({ grow_closer_followup_date: interactionDate })
          .eq('user_id', user.id)
          .eq('week_date', weekDate)
          .is('grow_closer_followup_date', null)
      }

      // Cancel the notification for this connection since we just interacted
      await cancelConnectionNotification(connection.id)

      // Update daily streak and check for achievements
      let newAchievements: AchievementDefinition[] = []
      try {
        const streakResult = await updateDailyStreak(supabase, user.id, interactionDate)
        newAchievements = streakResult.newAchievements
      } catch (streakError) {
        console.error('Failed to update streak:', streakError)
      }

      // Reset form and close
      setActionType('call')
      setMood(null)
      setMemory('')
      setInteractionDate(new Date().toISOString().split('T')[0])
      setPlanNextCatchup(false)
      setNextCatchupDate('')
      onSuccess(newAchievements.length > 0 ? newAchievements : undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl overscroll-contain">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-lavender-800">
              Record catch-up with {connection.name}
            </h2>
            <button
              onClick={onClose}
              className="text-lavender-400 hover:text-lavender-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Reflection Priority Badge */}
          {isReflectionPriority && (
            <div className="mb-4 p-3 bg-muted-teal-50 rounded-xl border border-muted-teal-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌱</span>
                <div>
                  <div className="text-sm font-medium text-muted-teal-700">
                    Reflection Priority
                  </div>
                  <div className="text-xs text-muted-teal-600">
                    You wanted to grow closer to {connection.name} this week
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Interaction Date */}
            <div>
              <label htmlFor="interactionDate" className="block text-sm font-medium text-lavender-700 mb-2">
                When did you catch-up?
              </label>
              <input
                id="interactionDate"
                type="date"
                value={interactionDate}
                onChange={(e) => setInteractionDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Interaction Type - 3 buttons */}
            <div>
              <label className="block text-sm font-medium text-lavender-700 mb-2">
                How did you catch-up?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {interactionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setActionType(type.value)}
                    className={`py-3 px-2 rounded-xl text-center transition-all ${
                      actionType === type.value
                        ? 'bg-muted-teal-400 text-white'
                        : 'bg-lavender-50 text-lavender-600 hover:bg-lavender-100'
                    }`}
                  >
                    <div className="text-xl mb-1">{type.icon}</div>
                    <div className="text-xs font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-lavender-700 mb-2">
                How did it feel?
              </label>
              <div className="flex gap-3 justify-center">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMood(mood === option.value ? null : option.value)}
                    className={`text-3xl p-2 rounded-xl transition-all ${
                      mood === option.value
                        ? 'bg-muted-teal-100 ring-2 ring-muted-teal-400 scale-110'
                        : 'hover:bg-lavender-50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {option.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Memory */}
            <div>
              <textarea
                id="memory"
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all resize-none"
                placeholder="Add a note (optional)"
              />
            </div>

            {/* Plan Next Catchup */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={planNextCatchup}
                    onChange={(e) => setPlanNextCatchup(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all ${
                    planNextCatchup
                      ? 'bg-muted-teal-400 border-muted-teal-400'
                      : 'border-lavender-300'
                  }`}>
                    {planNextCatchup && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-lavender-700">Plan next catch-up</span>
              </label>

              {planNextCatchup && (
                <div className="mt-3 ml-8">
                  <input
                    type="date"
                    value={nextCatchupDate}
                    onChange={(e) => setNextCatchupDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save catch-up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
