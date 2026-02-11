'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, Interaction } from '@/types/database'
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
import { isFeatureEnabled } from '@/lib/featureFlags'

type ReflectionStep = 'connected' | 'grow_closer' | 'insights' | 'complete'

const interactionTypeLabel: Record<string, string> = {
  call: 'Call',
  text: 'Message',
  in_person: 'In person',
  other: 'Other'
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

    // Check if pattern reviews feature is enabled - redirect to new flow
    const patternReviewEnabled = await isFeatureEnabled('weekly_pattern_reviews', authUser.id)
    if (patternReviewEnabled) {
      router.push('/reflect/pattern-review')
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
      <main className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-text-tertiary">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bone">
      <div className="max-w-lg mx-auto px-6 pt-8 pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {step !== 'complete' && step !== 'connected' ? (
            <button
              onClick={handleBack}
              className="text-text-tertiary hover:text-obsidian text-body transition-all duration-calm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <Link
              href="/"
              className="text-text-tertiary hover:text-obsidian text-body transition-all duration-calm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {step === 'complete' ? 'Home' : 'Back'}
            </Link>
          )}
          <div className="text-moss font-medium text-h3">Weekly Reflection</div>
          <div className="w-12" />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-all duration-calm ${
            step === 'connected' ? 'bg-moss' : 'bg-text-placeholder'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-all duration-calm ${
            step === 'grow_closer' ? 'bg-moss' : 'bg-text-placeholder'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-all duration-calm ${
            step === 'insights' ? 'bg-moss' : 'bg-text-placeholder'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-all duration-calm ${
            step === 'complete' ? 'bg-moss' : 'bg-text-placeholder'
          }`} />
        </div>

        {/* Step 1: Most Connected */}
        {step === 'connected' && (
          <div className="bg-white rounded-lg p-6 shadow-card">
            <div className="text-center mb-6">
              <h2 className="text-h2 font-medium text-obsidian mb-2">
                Who did you feel most connected to this week?
              </h2>
              <p className="text-body text-text-secondary">
                Think about conversations that felt meaningful
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => setMostConnected(connection.id)}
                  className={`w-full p-4 rounded-md text-left transition-all duration-calm ${
                    mostConnected === connection.id
                      ? 'bg-bone-warm ring-2 ring-moss'
                      : 'bg-bone-warm hover:bg-bone-warm/60'
                  }`}
                >
                  <div className="font-medium text-obsidian">{connection.name}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 bg-transparent hover:bg-bone-warm text-obsidian font-medium rounded-md transition-all duration-calm"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!mostConnected}
                className="flex-1 py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Grow Closer */}
        {step === 'grow_closer' && (
          <div className="bg-white rounded-lg p-6 shadow-card">
            <div className="text-center mb-6">
              <h2 className="text-h2 font-medium text-obsidian mb-2">
                Is there anyone you&apos;d like to grow closer to?
              </h2>
              <p className="text-body text-text-secondary">
                Someone you&apos;ve been meaning to reach out to
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => setGrowCloser(connection.id)}
                  className={`w-full p-4 rounded-md text-left transition-all duration-calm ${
                    growCloser === connection.id
                      ? 'bg-bone-warm ring-2 ring-moss'
                      : 'bg-bone-warm hover:bg-bone-warm/60'
                  }`}
                >
                  <div className="font-medium text-obsidian">{connection.name}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 bg-transparent hover:bg-bone-warm text-obsidian font-medium rounded-md transition-all duration-calm"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!growCloser}
                className="flex-1 py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-white rounded-lg p-6 shadow-card">
              <div className="text-center mb-4">
                <h2 className="text-h3 font-medium text-obsidian">
                  Growing closer with {growCloserConnection.name}
                </h2>
              </div>

              {/* Maintenance Gap Visual */}
              {maintenanceGap && (
                <div className="mb-4">
                  <div className="flex justify-between text-body mb-2">
                    <span className="text-text-secondary">Connection health</span>
                    <span className={`font-medium ${
                      maintenanceGap.status === 'ahead' || maintenanceGap.status === 'on_track'
                        ? 'text-moss'
                        : maintenanceGap.status === 'behind'
                        ? 'text-sun'
                        : 'text-ember'
                    }`}>
                      {maintenanceGap.status === 'ahead' && 'Ahead'}
                      {maintenanceGap.status === 'on_track' && 'On track'}
                      {maintenanceGap.status === 'behind' && 'Behind'}
                      {maintenanceGap.status === 'overdue' && 'Overdue'}
                      {maintenanceGap.status === 'never_contacted' && 'New'}
                    </span>
                  </div>
                  <p className="text-body text-text-secondary mt-2">{maintenanceGap.message}</p>
                </div>
              )}

              {/* Streak Display */}
              {streak.currentStreak > 0 && (
                <div className="bg-bone-warm rounded-md p-3">
                  <div className="text-body font-medium text-moss">
                    {streak.currentStreak} week streak
                  </div>
                  <div className="text-micro text-text-tertiary">
                    You&apos;ve reflected {streak.totalReflections} times total
                  </div>
                </div>
              )}
            </div>

            {/* Recent Interactions */}
            {recentInteractions.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-card">
                <h3 className="text-body font-medium text-obsidian mb-3">Recent History</h3>
                <div className="space-y-3">
                  {recentInteractions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-medium text-obsidian">
                            {interactionTypeLabel[interaction.interaction_type] || interaction.interaction_type}
                          </span>
                          <span className="text-micro text-text-tertiary">
                            {formatRelativeDate(interaction.interaction_date)}
                          </span>
                        </div>
                        {interaction.memory && (
                          <p className="text-body text-text-secondary italic truncate">
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
              <div className="bg-white rounded-lg p-6 shadow-card">
                <h3 className="text-body font-medium text-obsidian mb-3">Suggestions for you</h3>
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md ${
                        suggestion.priority === 'high'
                          ? 'bg-bone-warm ring-1 ring-moss/30'
                          : 'bg-bone-warm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div>
                          <div className="text-body font-medium text-obsidian">
                            {suggestion.message}
                          </div>
                          <div className="text-micro text-text-secondary mt-1 italic">
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
              className="w-full py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="bg-white rounded-lg p-8 shadow-card text-center">
            <h2 className="text-h2 font-medium text-obsidian mb-3">
              Thank you for reflecting
            </h2>

            <p className="text-obsidian mb-6 leading-relaxed">
              Small moments build strong roots.
            </p>

            <div className="bg-bone-warm rounded-md p-4 mb-6 text-left">
              <p className="text-body text-obsidian italic">
                &ldquo;The quality of your life is the quality of your relationships.&rdquo;
              </p>
              <p className="text-micro text-text-tertiary mt-2">— Tony Robbins</p>
            </div>

            {/* Summary */}
            {(mostConnected || growCloser) && (
              <div className="text-left mb-6 space-y-3">
                {mostConnected && (
                  <div className="bg-bone-warm rounded-md p-4">
                    <div className="text-micro text-text-tertiary mb-1">Felt most connected to</div>
                    <div className="text-obsidian font-medium">
                      {connections.find(c => c.id === mostConnected)?.name}
                    </div>
                  </div>
                )}
                {growCloser && (
                  <div className="bg-bone-warm rounded-md p-4">
                    <div className="text-micro text-text-tertiary mb-1">Want to grow closer to</div>
                    <div className="text-obsidian font-medium">
                      {connections.find(c => c.id === growCloser)?.name}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Streak celebration */}
            {streak.currentStreak > 0 && (
              <div className="bg-bone-warm rounded-md p-4 mb-6 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-moss">
                    {streak.currentStreak + 1} week reflection streak
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/"
                className="inline-block w-full py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm text-center"
              >
                Back to Today
              </Link>
              <Link
                href="/reflect/history"
                className="inline-block w-full py-3 px-4 bg-transparent hover:bg-bone-warm text-obsidian font-medium rounded-md transition-all duration-calm text-center"
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
