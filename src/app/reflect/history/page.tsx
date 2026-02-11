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
  most_connected_name?: string | null
  grow_closer_name?: string | null
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

    // Fetch reflections
    const { data: reflectionsData } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', authUser.id)
      .order('week_date', { ascending: false })
      .limit(52)

    if (!reflectionsData) {
      setLoading(false)
      return
    }

    // Fetch all connections for this user to map names
    const { data: connectionsData } = await supabase
      .from('connections')
      .select('id, name')
      .eq('user_id', authUser.id)

    const connectionMap = new Map<string, string>()
    if (connectionsData) {
      connectionsData.forEach((c: Pick<Connection, 'id' | 'name'>) => {
        connectionMap.set(c.id, c.name)
      })
    }

    // Map reflections with connection names
    const enrichedReflections: ReflectionWithConnections[] = reflectionsData.map((r: WeeklyReflection) => ({
      ...r,
      most_connected_name: r.most_connected_id ? connectionMap.get(r.most_connected_id) || null : null,
      grow_closer_name: r.grow_closer_id ? connectionMap.get(r.grow_closer_id) || null : null
    }))

    setReflections(enrichedReflections)
    setStreak(calculateReflectionStreak(reflectionsData))
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchReflections()
  }, [fetchReflections])

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
          <Link
            href="/"
            className="text-text-tertiary hover:text-obsidian text-body transition-all duration-calm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="text-moss font-medium text-h3">Reflection History</div>
          <div className="w-12" />
        </div>

        {/* Streak Stats */}
        <div className="bg-white rounded-lg p-6 shadow-card mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-h1 font-medium text-moss">{streak.currentStreak}</div>
              <div className="text-micro text-text-tertiary">Current streak</div>
            </div>
            <div>
              <div className="text-h1 font-medium text-obsidian">{streak.longestStreak}</div>
              <div className="text-micro text-text-tertiary">Longest streak</div>
            </div>
            <div>
              <div className="text-h1 font-medium text-obsidian">{streak.totalReflections}</div>
              <div className="text-micro text-text-tertiary">Total reflections</div>
            </div>
          </div>

          {streak.currentStreak > 0 && (
            <div className="mt-4 pt-4 border-t border-bone-warm">
              <div className="flex items-center justify-center gap-2 text-moss">
                <span className="text-body font-medium">
                  {streak.currentStreak} week{streak.currentStreak > 1 ? 's' : ''} in a row
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
                  className="bg-white rounded-lg p-5 shadow-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-body font-medium text-obsidian">
                      {dateRange.start} - {dateRange.end}
                    </div>
                    {reflection.grow_closer_name && hasFollowedUp && (
                      <div className="flex items-center gap-1 text-micro text-moss bg-bone-warm px-2 py-1 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Followed up
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {reflection.most_connected_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-micro text-text-tertiary">Most connected:</span>
                        <span className="text-body font-medium text-obsidian">
                          {reflection.most_connected_name}
                        </span>
                      </div>
                    )}

                    {reflection.grow_closer_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-micro text-text-tertiary">Grow closer:</span>
                        <span className="text-body font-medium text-obsidian">
                          {reflection.grow_closer_name}
                        </span>
                        {!hasFollowedUp && (
                          <span className="text-micro text-sun bg-bone-warm px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                    )}

                    {!reflection.most_connected_name && !reflection.grow_closer_name && (
                      <div className="text-body text-text-secondary italic">
                        Skipped selections
                      </div>
                    )}

                    {reflection.reflection_notes && (
                      <div className="mt-2 pt-2 border-t border-bone-warm">
                        <p className="text-body text-text-secondary italic">
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
          <div className="bg-white rounded-lg p-8 shadow-card text-center">
            <h2 className="text-h3 font-medium text-obsidian mb-2">
              No reflections yet
            </h2>
            <p className="text-text-secondary mb-6">
              Start your first weekly reflection to see your history here.
            </p>
            <Link
              href="/reflect"
              className="inline-block py-3 px-6 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm"
            >
              Start reflecting
            </Link>
          </div>
        )}

        {/* Start New Reflection Button */}
        {reflections.length > 0 && (
          <Link
            href="/reflect"
            className="mt-6 block w-full py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm text-center"
          >
            Start this week&apos;s reflection
          </Link>
        )}
      </div>
    </main>
  )
}
