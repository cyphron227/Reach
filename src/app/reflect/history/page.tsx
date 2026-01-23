'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeeklyReflection, Connection } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getWeekDateRange,
  calculateReflectionStreak,
  ReflectionStreak
} from '@/lib/reflectionUtils'

interface ReflectionWithConnections extends WeeklyReflection {
  most_connected?: { id: string; name: string } | null
  grow_closer?: { id: string; name: string } | null
}

export default function ReflectionHistoryPage() {
  const [reflections, setReflections] = useState<ReflectionWithConnections[]>([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState<ReflectionStreak>({ currentStreak: 0, longestStreak: 0, totalReflections: 0 })

  const router = useRouter()
  const supabase = createClient()

  const fetchReflections = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('weekly_reflections')
      .select(`
        *,
        most_connected:connections!most_connected_id(id, name),
        grow_closer:connections!grow_closer_id(id, name)
      `)
      .eq('user_id', authUser.id)
      .order('week_date', { ascending: false })
      .limit(52)

    if (data) {
      setReflections(data as ReflectionWithConnections[])
      setStreak(calculateReflectionStreak(data))
    }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchReflections()
  }, [fetchReflections])

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
          <Link
            href="/"
            className="text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="text-muted-teal-500 font-semibold text-lg">Reflection History</div>
          <div className="w-12" />
        </div>

        {/* Streak Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-muted-teal-600">{streak.currentStreak}</div>
              <div className="text-xs text-lavender-500">Current streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lavender-600">{streak.longestStreak}</div>
              <div className="text-xs text-lavender-500">Longest streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lavender-600">{streak.totalReflections}</div>
              <div className="text-xs text-lavender-500">Total reflections</div>
            </div>
          </div>

          {streak.currentStreak > 0 && (
            <div className="mt-4 pt-4 border-t border-lavender-100">
              <div className="flex items-center justify-center gap-2 text-muted-teal-600">
                <span className="text-xl">🔥</span>
                <span className="text-sm font-medium">
                  {streak.currentStreak} week{streak.currentStreak > 1 ? 's' : ''} in a row!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Reflections List */}
        {reflections.length > 0 ? (
          <div className="space-y-4">
            {reflections.map((reflection) => {
              const dateRange = getWeekDateRange(reflection.week_date)
              const hasFollowedUp = !!reflection.grow_closer_followup_date

              return (
                <div
                  key={reflection.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-lavender-100"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-lavender-700">
                      {dateRange.start} - {dateRange.end}
                    </div>
                    {reflection.grow_closer && hasFollowedUp && (
                      <div className="flex items-center gap-1 text-xs text-muted-teal-600 bg-muted-teal-50 px-2 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Followed up
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {reflection.most_connected && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">💭</span>
                        <span className="text-xs text-lavender-500">Most connected:</span>
                        <span className="text-sm font-medium text-lavender-700">
                          {reflection.most_connected.name}
                        </span>
                      </div>
                    )}

                    {reflection.grow_closer && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌱</span>
                        <span className="text-xs text-lavender-500">Grow closer:</span>
                        <span className="text-sm font-medium text-lavender-700">
                          {reflection.grow_closer.name}
                        </span>
                        {!hasFollowedUp && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                    )}

                    {!reflection.most_connected && !reflection.grow_closer && (
                      <div className="text-sm text-lavender-400 italic">
                        Skipped selections
                      </div>
                    )}

                    {reflection.reflection_notes && (
                      <div className="mt-2 pt-2 border-t border-lavender-100">
                        <p className="text-sm text-lavender-600 italic">
                          &ldquo;{reflection.reflection_notes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">💭</div>
            <h2 className="text-lg font-semibold text-lavender-800 mb-2">
              No reflections yet
            </h2>
            <p className="text-lavender-500 mb-6">
              Start your first weekly reflection to see your history here.
            </p>
            <Link
              href="/reflect"
              className="inline-block py-3 px-6 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
            >
              Start reflecting
            </Link>
          </div>
        )}

        {/* Start New Reflection Button */}
        {reflections.length > 0 && (
          <Link
            href="/reflect"
            className="mt-6 block w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors text-center"
          >
            Start this week&apos;s reflection
          </Link>
        )}
      </div>
    </main>
  )
}
