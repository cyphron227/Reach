'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, Interaction, WeeklyReflection } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getWeekStartDate,
  calculateMaintenanceGap,
  generateSuggestions,
  calculateReflectionStreak,
  formatRelativeDate,
  SuggestedAction,
  MaintenanceGap,
  ReflectionStreak
} from '@/lib/reflectionUtils'

type ReflectionStep = 'connected' | 'grow_closer' | 'insights' | 'complete'

const interactionTypeEmoji: Record<string, string> = {
  call: '📞',
  text: '💬',
  in_person: '🤝',
  other: '✨'
}

export default function ReflectPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<ReflectionStep>('connected')
  const [mostConnected, setMostConnected] = useState<string | null>(null)
  const [growCloser, setGrowCloser] = useState<string | null>(null)

  // Insights data
  const [growCloserConnection, setGrowCloserConnection] = useState<Connection | null>(null)
  const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([])
  const [maintenanceGap, setMaintenanceGap] = useState<MaintenanceGap | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([])
  const [streak, setStreak] = useState<ReflectionStreak>({ currentStreak: 0, longestStreak: 0, totalReflections: 0 })

  const router = useRouter()
  const supabase = createClient()

  const fetchConnections = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', authUser.id)
      .order('name', { ascending: true })

    setConnections(data || [])
    setLoading(false)
  }, [supabase, router])

  const fetchReflectionStreak = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: reflections } = await supabase
      .from('weekly_reflections')
      .select('week_date')
      .eq('user_id', authUser.id)
      .order('week_date', { ascending: false })
      .limit(52)

    if (reflections) {
      setStreak(calculateReflectionStreak(reflections))
    }
  }, [supabase])

  const fetchInsightsData = useCallback(async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (!connection) return

    setGrowCloserConnection(connection)

    // Calculate maintenance gap
    const gap = calculateMaintenanceGap(connection.last_interaction_date, connection.catchup_frequency)
    setMaintenanceGap(gap)

    // Fetch recent interactions
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*')
      .eq('connection_id', connectionId)
      .order('interaction_date', { ascending: false })
      .limit(5)

    const interactionsData = interactions || []
    setRecentInteractions(interactionsData)

    // Generate suggestions based on interaction history
    const allInteractions = await supabase
      .from('interactions')
      .select('*')
      .eq('connection_id', connectionId)
      .order('interaction_date', { ascending: false })
      .limit(20)

    setSuggestions(generateSuggestions(allInteractions.data || []))
  }, [supabase, connections])

  useEffect(() => {
    fetchConnections()
    fetchReflectionStreak()
  }, [fetchConnections, fetchReflectionStreak])

  const handleNext = async () => {
    if (step === 'connected') {
      setStep('grow_closer')
    } else if (step === 'grow_closer') {
      if (growCloser) {
        await fetchInsightsData(growCloser)
        setStep('insights')
      } else {
        // Skip insights if no grow closer selected
        await saveReflection()
        setStep('complete')
      }
    } else if (step === 'insights') {
      await saveReflection()
      setStep('complete')
    }
  }

  const handleSkip = async () => {
    if (step === 'connected') {
      setStep('grow_closer')
    } else if (step === 'grow_closer') {
      await saveReflection()
      setStep('complete')
    }
  }

  const handleBack = () => {
    if (step === 'grow_closer') {
      setStep('connected')
    } else if (step === 'insights') {
      setStep('grow_closer')
    }
  }

  const saveReflection = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const weekDate = getWeekStartDate()

    const { error } = await supabase
      .from('weekly_reflections')
      .upsert({
        user_id: user.id,
        week_date: weekDate,
        most_connected_id: mostConnected || null,
        grow_closer_id: growCloser || null,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,week_date'
      })

    if (error) {
      console.error('Failed to save reflection:', error)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-lavender-50">
      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {step !== 'complete' && step !== 'connected' ? (
            <button
              onClick={handleBack}
              className="text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <Link
              href="/"
              className="text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {step === 'complete' ? 'Home' : 'Back'}
            </Link>
          )}
          <div className="text-muted-teal-500 font-semibold text-lg">Weekly Reflection</div>
          <div className="w-12" />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'connected' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'grow_closer' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'insights' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'complete' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
        </div>

        {/* Step 1: Most Connected */}
        {step === 'connected' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">💭</div>
              <h2 className="text-xl font-semibold text-lavender-800 mb-2">
                Who did you feel most connected to this week?
              </h2>
              <p className="text-sm text-lavender-500">
                Think about conversations that felt meaningful
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => setMostConnected(connection.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    mostConnected === connection.id
                      ? 'bg-muted-teal-100 border-2 border-muted-teal-400'
                      : 'bg-lavender-50 border-2 border-transparent hover:bg-lavender-100'
                  }`}
                >
                  <div className="font-medium text-lavender-800">{connection.name}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!mostConnected}
                className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Grow Closer */}
        {step === 'grow_closer' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">🌱</div>
              <h2 className="text-xl font-semibold text-lavender-800 mb-2">
                Is there anyone you&apos;d like to grow closer to?
              </h2>
              <p className="text-sm text-lavender-500">
                Someone you&apos;ve been meaning to reach out to
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => setGrowCloser(connection.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    growCloser === connection.id
                      ? 'bg-muted-teal-100 border-2 border-muted-teal-400'
                      : 'bg-lavender-50 border-2 border-transparent hover:bg-lavender-100'
                  }`}
                >
                  <div className="font-medium text-lavender-800">{connection.name}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!growCloser}
                className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Insights */}
        {step === 'insights' && growCloserConnection && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🌱</div>
                <h2 className="text-lg font-semibold text-lavender-800">
                  Growing closer with {growCloserConnection.name}
                </h2>
              </div>

              {/* Maintenance Gap Visual */}
              {maintenanceGap && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-lavender-600">Connection health</span>
                    <span className={`font-medium ${
                      maintenanceGap.status === 'ahead' || maintenanceGap.status === 'on_track'
                        ? 'text-muted-teal-600'
                        : maintenanceGap.status === 'behind'
                        ? 'text-amber-600'
                        : 'text-red-500'
                    }`}>
                      {maintenanceGap.status === 'ahead' && 'Ahead'}
                      {maintenanceGap.status === 'on_track' && 'On track'}
                      {maintenanceGap.status === 'behind' && 'Behind'}
                      {maintenanceGap.status === 'overdue' && 'Overdue'}
                      {maintenanceGap.status === 'never_contacted' && 'New'}
                    </span>
                  </div>
                  <div className="h-2 bg-lavender-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        maintenanceGap.status === 'ahead' || maintenanceGap.status === 'on_track'
                          ? 'bg-muted-teal-400'
                          : maintenanceGap.status === 'behind'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(100, maintenanceGap.progressPercent)}%` }}
                    />
                  </div>
                  <p className="text-sm text-lavender-500 mt-2">{maintenanceGap.message}</p>
                </div>
              )}

              {/* Streak Display */}
              {streak.currentStreak > 0 && (
                <div className="bg-muted-teal-50 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <div>
                    <div className="text-sm font-medium text-muted-teal-700">
                      {streak.currentStreak} week streak!
                    </div>
                    <div className="text-xs text-muted-teal-600">
                      You&apos;ve reflected {streak.totalReflections} times total
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Interactions */}
            {recentInteractions.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
                <h3 className="text-sm font-semibold text-lavender-700 mb-3">Recent History</h3>
                <div className="space-y-3">
                  {recentInteractions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3">
                      <span className="text-lg">{interactionTypeEmoji[interaction.interaction_type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-lavender-700 capitalize">
                            {interaction.interaction_type === 'in_person' ? 'In person' : interaction.interaction_type}
                          </span>
                          <span className="text-xs text-lavender-400">
                            {formatRelativeDate(interaction.interaction_date)}
                          </span>
                        </div>
                        {interaction.memory && (
                          <p className="text-sm text-lavender-500 italic truncate">
                            &ldquo;{interaction.memory}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Science-Backed Suggestions */}
            {suggestions.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
                <h3 className="text-sm font-semibold text-lavender-700 mb-3 flex items-center gap-2">
                  <span>💡</span> Suggestions for you
                </h3>
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl ${
                        suggestion.priority === 'high'
                          ? 'bg-muted-teal-50 border border-muted-teal-200'
                          : 'bg-lavender-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{suggestion.emoji}</span>
                        <div>
                          <div className="text-sm font-medium text-lavender-800">
                            {suggestion.message}
                          </div>
                          <div className="text-xs text-lavender-500 mt-1 italic">
                            {suggestion.scienceNote}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleNext}
              disabled={saving}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">🌳</div>
            <h2 className="text-xl font-semibold text-lavender-800 mb-3">
              Thank you for reflecting
            </h2>

            <p className="text-lavender-600 mb-6 leading-relaxed">
              Small moments build strong roots.
            </p>

            <div className="bg-muted-teal-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-muted-teal-700 italic">
                &ldquo;The quality of your life is the quality of your relationships.&rdquo;
              </p>
              <p className="text-xs text-muted-teal-600 mt-2">— Tony Robbins</p>
            </div>

            {/* Summary */}
            {(mostConnected || growCloser) && (
              <div className="text-left mb-6 space-y-3">
                {mostConnected && (
                  <div className="bg-lavender-50 rounded-xl p-4">
                    <div className="text-xs text-lavender-500 mb-1">Felt most connected to</div>
                    <div className="text-lavender-800 font-medium">
                      {connections.find(c => c.id === mostConnected)?.name}
                    </div>
                  </div>
                )}
                {growCloser && (
                  <div className="bg-lavender-50 rounded-xl p-4">
                    <div className="text-xs text-lavender-500 mb-1">Want to grow closer to</div>
                    <div className="text-lavender-800 font-medium">
                      {connections.find(c => c.id === growCloser)?.name}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Streak celebration */}
            {streak.currentStreak > 0 && (
              <div className="bg-muted-teal-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <span className="text-sm font-medium text-muted-teal-700">
                    {streak.currentStreak + 1} week reflection streak!
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/"
                className="inline-block w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors text-center"
              >
                Back to Today
              </Link>
              <Link
                href="/reflect/history"
                className="inline-block w-full py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors text-center"
              >
                View reflection history
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
