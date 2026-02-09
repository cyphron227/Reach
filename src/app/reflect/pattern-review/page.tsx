'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isFeatureEnabled } from '@/lib/featureFlags'
import {
  WeeklyPatternData,
  ConnectionHealthV2,
  INSIGHT_MESSAGES,
  ActionTypeV2,
  ACTION_LABELS,
} from '@/types/habitEngine'
import { analyzeWeeklyPattern } from '@/lib/habitEngineUtils'
import { RelationshipStrengthCard } from '@/components/RelationshipStrengthBadge'

type ReviewStep = 'overview' | 'connections' | 'insights' | 'complete'

// Extended pattern data with extra computed fields
interface PatternAnalysis extends WeeklyPatternData {
  totalWeight: number
  actionCount: number
  validDays: number
  primaryInsight: string
  actionBreakdown: Record<ActionTypeV2, number>
}

export default function PatternReviewPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<ReviewStep>('overview')
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionHealth, setConnectionHealth] = useState<Map<string, ConnectionHealthV2>>(new Map())
  const [weeklyPattern, setWeeklyPattern] = useState<PatternAnalysis | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if feature is enabled
    const enabled = await isFeatureEnabled('weekly_pattern_reviews', user.id)
    if (!enabled) {
      // Redirect to standard reflect page if flag not enabled
      router.push('/reflect')
      return
    }

    // Fetch connections
    const { data: connectionsData } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    setConnections(connectionsData || [])

    // Fetch connection health v2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as unknown as { from: (t: string) => any }
    const { data: healthData } = await supabaseAny
      .from('connection_health_v2')
      .select('*')
      .eq('user_id', user.id)

    const healthMap = new Map<string, ConnectionHealthV2>()
    for (const health of (healthData || [])) {
      healthMap.set(health.connection_id, health)
    }
    setConnectionHealth(healthMap)

    // Fetch weekly actions for pattern analysis
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]

    const { data: weeklyActions } = await supabaseAny
      .from('daily_actions')
      .select('*')
      .eq('user_id', user.id)
      .gte('action_date', weekAgoStr)

    // Fetch daily habit logs to count valid days
    const { data: habitLogs } = await supabaseAny
      .from('daily_habit_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', weekAgoStr)

    // Analyze the week's patterns
    const baseAnalysis = analyzeWeeklyPattern(weeklyActions || [])

    // Calculate additional metrics
    const actions = weeklyActions || []
    const totalWeight = actions.reduce((sum: number, a: { action_weight: number }) => sum + a.action_weight, 0)
    const validDays = (habitLogs || []).filter((log: { is_valid_day: boolean }) => log.is_valid_day).length

    // Count actions by type
    const actionBreakdown: Record<ActionTypeV2, number> = {
      text: 0,
      call: 0,
      in_person_1on1: 0,
    }
    for (const action of actions) {
      if (action.action_type in actionBreakdown) {
        actionBreakdown[action.action_type as ActionTypeV2]++
      }
    }

    const extendedAnalysis: PatternAnalysis = {
      ...baseAnalysis,
      totalWeight,
      actionCount: actions.length,
      validDays,
      primaryInsight: baseAnalysis.insight_message,
      actionBreakdown,
    }
    setWeeklyPattern(extendedAnalysis)

    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleNext = async () => {
    if (step === 'overview') {
      setStep('connections')
    } else if (step === 'connections') {
      setStep('insights')
    } else if (step === 'insights') {
      await saveReview()
      setStep('complete')
    }
  }

  const handleBack = () => {
    if (step === 'connections') {
      setStep('overview')
    } else if (step === 'insights') {
      setStep('connections')
    }
  }

  const saveReview = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !weeklyPattern) {
      setSaving(false)
      return
    }

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny2 = supabase as unknown as { from: (t: string) => any }
    await supabaseAny2.from('weekly_pattern_reviews').upsert({
      user_id: user.id,
      week_start_date: weekStartStr,
      depth_score: weeklyPattern.depth_score,
      variety_score: weeklyPattern.variety_score,
      consistency_score: weeklyPattern.consistency_score,
      total_weight: weeklyPattern.totalWeight,
      action_count: weeklyPattern.actionCount,
      valid_days: weeklyPattern.validDays,
      primary_insight: weeklyPattern.primaryInsight,
      patterns: {
        depth_score: weeklyPattern.depth_score,
        variety_score: weeklyPattern.variety_score,
        consistency_score: weeklyPattern.consistency_score,
        insight_type: weeklyPattern.insight_type,
        actionBreakdown: weeklyPattern.actionBreakdown,
      },
      completed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,week_start_date'
    })

    setSaving(false)
  }

  // Get connections that need attention (thinning or decaying)
  const connectionsNeedingAttention = connections.filter(c => {
    const health = connectionHealth.get(c.id)
    return health && (health.current_strength === 'thinning' || health.current_strength === 'decaying')
  })

  // Get connections that are flourishing
  const flourishingConnections = connections.filter(c => {
    const health = connectionHealth.get(c.id)
    return health && health.current_strength === 'flourishing'
  })

  if (loading) {
    return (
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-lavender-50">
      <div className="max-w-lg mx-auto px-6 pt-8 pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {step !== 'complete' && step !== 'overview' ? (
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
          <div className="text-muted-teal-500 font-semibold text-lg">Pattern Review</div>
          <div className="w-12" />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'overview' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'connections' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'insights' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'complete' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
        </div>

        {/* Step 1: Overview */}
        {step === 'overview' && weeklyPattern && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">📊</div>
                <h2 className="text-xl font-semibold text-lavender-800 mb-2">
                  Your Week in Review
                </h2>
                <p className="text-sm text-lavender-500">
                  {weeklyPattern.validDays} valid days this week
                </p>
              </div>

              {/* Score Cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-lavender-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-muted-teal-600">
                    {weeklyPattern.depth_score}
                  </div>
                  <div className="text-xs text-lavender-500">Depth</div>
                </div>
                <div className="bg-lavender-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-muted-teal-600">
                    {weeklyPattern.variety_score}
                  </div>
                  <div className="text-xs text-lavender-500">Variety</div>
                </div>
                <div className="bg-lavender-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-muted-teal-600">
                    {weeklyPattern.consistency_score}
                  </div>
                  <div className="text-xs text-lavender-500">Consistency</div>
                </div>
              </div>

              {/* Action Breakdown */}
              <div className="bg-lavender-50 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-medium text-lavender-700 mb-3">Action Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(weeklyPattern.actionBreakdown).map(([type, count]) => (
                    count > 0 && (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-lavender-600">
                          {ACTION_LABELS[type as ActionTypeV2] || type.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium text-lavender-800">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Primary Insight */}
              <div className="bg-muted-teal-50 rounded-xl p-4">
                <p className="text-sm text-muted-teal-700">
                  {weeklyPattern.primaryInsight}
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Connections */}
        {step === 'connections' && (
          <div className="space-y-4">
            {/* Connections Needing Attention */}
            {connectionsNeedingAttention.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">⚠️</span>
                  <h3 className="font-semibold text-lavender-800">Need Attention</h3>
                </div>
                <div className="space-y-3">
                  {connectionsNeedingAttention.map(connection => {
                    const health = connectionHealth.get(connection.id)
                    return (
                      <button
                        key={connection.id}
                        onClick={() => setSelectedConnection(
                          selectedConnection === connection.id ? null : connection.id
                        )}
                        className={`w-full text-left transition-all ${
                          selectedConnection === connection.id
                            ? 'ring-2 ring-muted-teal-400'
                            : ''
                        }`}
                      >
                        <RelationshipStrengthCard
                          strength={health?.current_strength || 'stable'}
                          connectionName={connection.name}
                          daysSinceAction={health?.days_since_action ?? null}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Flourishing Connections */}
            {flourishingConnections.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🌸</span>
                  <h3 className="font-semibold text-lavender-800">Flourishing</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {flourishingConnections.map(connection => (
                    <div
                      key={connection.id}
                      className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm"
                    >
                      {connection.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All other connections summary */}
            {connections.length > connectionsNeedingAttention.length + flourishingConnections.length && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌿</span>
                  <h3 className="font-semibold text-lavender-800">Stable</h3>
                </div>
                <p className="text-sm text-lavender-500">
                  {connections.length - connectionsNeedingAttention.length - flourishingConnections.length} connections maintaining healthy balance
                </p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Insights */}
        {step === 'insights' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">💡</div>
                <h2 className="text-xl font-semibold text-lavender-800 mb-2">
                  Insights for You
                </h2>
              </div>

              <div className="space-y-4">
                {/* Identity reminder */}
                <div className="bg-muted-teal-50 rounded-xl p-4">
                  <p className="text-sm text-muted-teal-700 font-medium">
                    {INSIGHT_MESSAGES.identity}
                  </p>
                </div>

                {/* Regret prevention */}
                <div className="bg-lavender-50 rounded-xl p-4">
                  <p className="text-sm text-lavender-700">
                    {INSIGHT_MESSAGES.regret_prevention}
                  </p>
                </div>

                {/* Encouragement based on week */}
                {weeklyPattern && weeklyPattern.validDays >= 5 && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-700">
                      {INSIGHT_MESSAGES.consistency_encouragement}
                    </p>
                  </div>
                )}

                {/* Depth suggestion if low */}
                {weeklyPattern && weeklyPattern.depth_score < 50 && (
                  <div className="bg-amber-50 rounded-xl p-4">
                    <p className="text-sm text-amber-700">
                      {INSIGHT_MESSAGES.depth_suggestion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={saving}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Complete Review'}
            </button>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">🌳</div>
            <h2 className="text-xl font-semibold text-lavender-800 mb-3">
              Pattern Review Complete
            </h2>

            <p className="text-lavender-600 mb-6 leading-relaxed">
              You&apos;re building meaningful connections, one action at a time.
            </p>

            {weeklyPattern && (
              <div className="bg-muted-teal-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-teal-700">This Week</span>
                  <span className="text-sm text-muted-teal-600">
                    {weeklyPattern.validDays}/7 valid days
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${
                        i < weeklyPattern.validDays ? 'bg-muted-teal-400' : 'bg-lavender-200'
                      }`}
                    />
                  ))}
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
                View history
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
