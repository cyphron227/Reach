'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Connection, User, UserStreak, AchievementDefinition, DailyHabitLog, ConnectionHealthV2 } from '@/types/database'
import Greeting from '@/components/Greeting'
import ConnectionCard from '@/components/ConnectionCard'
import LogInteractionModal from '@/components/LogInteractionModal'
import AddConnectionModal from '@/components/AddConnectionModal'
import EditConnectionModal from '@/components/EditConnectionModal'
import ConnectionDetailModal from '@/components/ConnectionDetailModal'
import PlanCatchupModal from '@/components/PlanCatchupModal'
import CatchupMethodModal from '@/components/CatchupMethodModal'
import AchievementUnlockModal from '@/components/AchievementUnlockModal'
import PendingCatchupPrompt from '@/components/PendingCatchupPrompt'
import DailyProgressIndicator, { CompactConnectionRing } from '@/components/DailyProgressIndicator'
import Link from 'next/link'
import { getOrCreateUserStreak, getNextMilestone, getDaysToNextMilestone } from '@/lib/streakUtils'
import { useRouter } from 'next/navigation'
import {
  isCapacitor,
  requestNotificationPermissions,
  scheduleConnectionNotifications,
  registerNotificationTapListener,
} from '@/lib/capacitor'
import { checkPendingIntents, PendingIntent, methodToInteractionType } from '@/lib/pendingIntents'
import { isFeatureEnabled } from '@/lib/featureFlags'

const CONNECTIONS_TO_SHOW = 3

// Helper functions for priority calculation
const frequencyToDays: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
  annually: 365,
}

function getDaysSince(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

function getDaysUntil(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Calculate priority score for sorting - lower number = higher priority (more urgent)
// Negative numbers = overdue, positive = days until due, large positive = not urgent
function calculatePriorityScore(connection: Connection): number {
  // If there's an explicit next_catchup_date, use that
  if (connection.next_catchup_date) {
    const daysUntil = getDaysUntil(connection.next_catchup_date)
    return daysUntil !== null ? daysUntil : 999999
  }

  // If never contacted, low priority (show last)
  if (!connection.last_interaction_date) {
    return 999999
  }

  // Calculate based on last interaction + frequency
  const daysSince = getDaysSince(connection.last_interaction_date)
  if (daysSince === null) return 999999

  const frequencyDays = frequencyToDays[connection.catchup_frequency] || 30
  const daysUntilDue = frequencyDays - daysSince

  return daysUntilDue
}

/**
 * SVG ring showing the last 7 days of streak progress.
 * Each of the 7 arc segments represents one day.
 */
function StreakRing({ streakDays, size = 24 }: { streakDays: number; size?: number }) {
  const segments = 7
  const gapAngle = 4 // degrees between segments
  const segmentAngle = (360 / segments) - gapAngle
  const radius = (size - 4) / 2
  const center = size / 2

  // Create 7 segments - fill from right to left (most recent on right)
  const renderSegment = (index: number) => {
    const isFilled = index < Math.min(streakDays, 7)
    const startAngle = index * (segmentAngle + gapAngle) - 90 // Start from top
    const endAngle = startAngle + segmentAngle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)

    return (
      <path
        key={index}
        d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
        fill={isFilled ? '#5F7A6A' : '#F0EEEA'}
        className="transition-all duration-300"
      />
    )
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: segments }).map((_, i) => renderSegment(i))}
    </svg>
  )
}

function TodayPageContent() {
  const [user, setUser] = useState<User | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [lastMemories, setLastMemories] = useState<Record<string, string>>({})
  const [lastMoods, setLastMoods] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showCatchupModal, setShowCatchupModal] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [showAllConnections, setShowAllConnections] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortMode, setSortMode] = useState<'soonest' | 'alphabetical'>('soonest')
  const [scrollY, setScrollY] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [notificationConnectionId, setNotificationConnectionId] = useState<string | null>(null)
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null)
  const [newAchievements, setNewAchievements] = useState<AchievementDefinition[]>([])
  const [showStreakInfo, setShowStreakInfo] = useState(false)
  const [pendingIntents, setPendingIntents] = useState<PendingIntent[]>([])
  const [pendingIntentForLog, setPendingIntentForLog] = useState<PendingIntent | null>(null)
  const [habitEngineEnabled, setHabitEngineEnabled] = useState(false)
  const [todayHabitLog, setTodayHabitLog] = useState<DailyHabitLog | null>(null)
  const [connectionHealthMap, setConnectionHealthMap] = useState<Record<string, ConnectionHealthV2>>({})
  const menuRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check synchronously if we have an auth code to handle
  const authCode = searchParams.get('code')
  const hasAuthCode = !!authCode

  // Handle auth codes that land on home page (fallback for misconfigured redirects)
  // Route to the callback page which handles the exchange client-side
  useEffect(() => {
    if (!authCode) return
    const type = searchParams.get('type')
    const params = new URLSearchParams({ code: authCode })
    if (type) params.set('type', type)
    router.replace(`/auth/callback?${params.toString()}`)
  }, [authCode, searchParams, router])

  // Track scroll position for shrinking header
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  // Register notification tap listener
  useEffect(() => {
    const cleanup = registerNotificationTapListener((connectionId) => {
      setNotificationConnectionId(connectionId)
    })
    return cleanup
  }, [])

  // Handle notification tap - open the connection details
  useEffect(() => {
    if (notificationConnectionId && connections.length > 0) {
      const connection = connections.find(c => c.id === notificationConnectionId)
      if (connection) {
        handleViewDetails(connection)
        setNotificationConnectionId(null)
      }
    }
  }, [notificationConnectionId, connections])

  const fetchUser = useCallback(async () => {
    // Don't redirect if we're handling an auth code
    if (hasAuthCode) return null

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return null
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // Check if onboarding is complete - redirect if not
    if (data && !data.onboarding_completed_at) {
      router.push('/onboarding')
      return null
    }

    return data
  }, [supabase, router, hasAuthCode])

  const fetchConnections = useCallback(async (): Promise<Connection[]> => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return []

    // Get all connections (filtering/sorting done client-side via useMemo)
    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', authUser.id)

    if (!data || data.length === 0) return []

    return data as Connection[]
  }, [supabase])

  const fetchLastInteractionData = useCallback(async (connectionIds: string[]): Promise<{ memories: Record<string, string>, moods: Record<string, string> }> => {
    if (connectionIds.length === 0) return { memories: {}, moods: {} }

    // Get recent interactions for each connection (mood + memory)
    const { data } = await supabase
      .from('interactions')
      .select('connection_id, memory, mood')
      .in('connection_id', connectionIds)
      .order('interaction_date', { ascending: false })

    if (!data) return { memories: {}, moods: {} }

    const memories: Record<string, string> = {}
    const moods: Record<string, string> = {}
    const seenForMood = new Set<string>()

    for (const interaction of data) {
      // First occurrence per connection = most recent interaction (for mood)
      if (!seenForMood.has(interaction.connection_id)) {
        seenForMood.add(interaction.connection_id)
        if (interaction.mood) {
          moods[interaction.connection_id] = interaction.mood
        }
      }
      // First non-null memory per connection
      if (!memories[interaction.connection_id] && interaction.memory) {
        memories[interaction.connection_id] = interaction.memory
      }
    }

    return { memories, moods }
  }, [supabase])

  // Filter and sort connections client-side (no refetch on search/sort change)
  const filteredConnections = useMemo(() => {
    let result = [...connections]

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    }

    // Apply sort
    result = sortMode === 'soonest'
      ? result.sort((a, b) => calculatePriorityScore(a) - calculatePriorityScore(b))
      : result.sort((a, b) => a.name.localeCompare(b.name))

    return result
  }, [connections, searchQuery, sortMode])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [userData, connectionsData] = await Promise.all([
      fetchUser(),
      fetchConnections(),
    ])

    // If user is not authenticated, fetchUser() already triggered redirect.
    // Keep showing loading state while redirect happens (prevents flash).
    if (!userData) return

    setUser(userData)
    setConnections(connectionsData)

    // Fetch user streak and pending intents
    if (userData) {
      try {
        const streak = await getOrCreateUserStreak(supabase, userData.id)
        setUserStreak(streak)
      } catch (error) {
        console.error('Failed to fetch streak:', error)
      }

      // Check for pending catch-up intents
      try {
        const pending = await checkPendingIntents(supabase, userData.id)
        setPendingIntents(pending)
      } catch (error) {
        console.error('Failed to check pending intents:', error)
      }

      // Check if habit engine is enabled and fetch data
      try {
        const enabled = await isFeatureEnabled('habit_engine_v1', userData.id)
        setHabitEngineEnabled(enabled)

        if (enabled) {
          // Fetch today's habit log (new table - use type assertion)
          const today = new Date().toISOString().split('T')[0]
          const { data: habitLog } = await (supabase as ReturnType<typeof createClient>)
            .from('daily_habit_log' as 'users')
            .select('*')
            .eq('user_id', userData.id)
            .eq('log_date', today)
            .single()

          if (habitLog) {
            setTodayHabitLog(habitLog as unknown as DailyHabitLog)
          }

          // Fetch connection health data (new table - use type assertion)
          if (connectionsData.length > 0) {
            const { data: healthData } = await (supabase as ReturnType<typeof createClient>)
              .from('connection_health_v2' as 'users')
              .select('*')
              .eq('user_id', userData.id)

            if (healthData && Array.isArray(healthData)) {
              const healthMap: Record<string, ConnectionHealthV2> = {}
              for (const h of healthData as unknown as ConnectionHealthV2[]) {
                healthMap[h.connection_id] = h
              }
              setConnectionHealthMap(healthMap)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch habit engine data:', error)
      }
    }

    // Fetch last memories and moods for all connections
    if (connectionsData.length > 0) {
      const connectionIds = connectionsData.map(c => c.id)
      const { memories, moods } = await fetchLastInteractionData(connectionIds)
      setLastMemories(memories)
      setLastMoods(moods)
    }

    // Schedule notifications for native app
    if (isCapacitor() && connectionsData.length > 0) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('notifications_enabled, notification_time')
            .eq('user_id', authUser.id)
            .single()

          if (settings?.notifications_enabled !== false) {
            // Request permissions if needed
            await requestNotificationPermissions()
            // Schedule notifications using user's preferred time
            const notificationTime = settings?.notification_time || '18:00'
            await scheduleConnectionNotifications(connectionsData, notificationTime)
          }
        }
      } catch (error) {
        console.error('Failed to schedule notifications:', error)
      }
    }

    setLoading(false)
  }, [fetchUser, fetchConnections, fetchLastInteractionData, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Initialize sort preference from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('ringur_sort_preference')
    if (savedSort === 'alphabetical' || savedSort === 'soonest') {
      setSortMode(savedSort)
    }
  }, [])

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem('ringur_sort_preference', sortMode)
  }, [sortMode])

  const handlePlanCatchup = (connection: Connection) => {
    setSelectedConnection(connection)
    setShowPlanModal(true)
  }

  const handleCatchup = (connection: Connection) => {
    setSelectedConnection(connection)
    setShowCatchupModal(true)
  }

  const handleLogInteraction = (connection: Connection) => {
    setSelectedConnection(connection)
    setShowDetailModal(false)
    setShowLogModal(true)
  }

  const handleEdit = (connection: Connection) => {
    setSelectedConnection(connection)
    setShowDetailModal(false)
    setShowEditModal(true)
  }

  const handleViewDetails = (connection: Connection) => {
    setSelectedConnection(connection)
    setShowDetailModal(true)
  }

  const handleLogSuccess = (achievements?: AchievementDefinition[]) => {
    // If this was from a pending intent, clear it
    if (pendingIntentForLog) {
      setPendingIntents(prev => prev.filter(p => p.intent.id !== pendingIntentForLog.intent.id))
      setPendingIntentForLog(null)
    }
    setSelectedConnection(null)
    setShowAllConnections(false)
    setSearchQuery('')
    loadData()
    // Show achievement unlock modal if there are new achievements
    if (achievements && achievements.length > 0) {
      setNewAchievements(achievements)
    }
  }

  const handleAddSuccess = () => {
    loadData()
  }

  const handleEditSuccess = () => {
    setSelectedConnection(null)
    loadData()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-ash">Loading...</div>
      </main>
    )
  }

  // Calculate header shrink based on scroll
  const headerScale = Math.max(0.7, 1 - scrollY / 200)
  const headerOpacity = Math.max(0.85, 1 - scrollY / 300)

  // Compact progress bar values (shared with sticky header)
  const totalWeight = todayHabitLog?.total_weight ?? 0
  const isValidDay = totalWeight >= 0.5
  const progressPercent = Math.min(100, (totalWeight / 6) * 100)
  const getRingColor = () => {
    if (isValidDay && totalWeight >= 3) return '#5F7A6A' // moss
    if (isValidDay) return '#5F7A6A' // moss
    if (totalWeight > 0) return '#E3B873' // sun
    return '#F0EEEA' // bone-warm
  }
  const showCompactProgress = habitEngineEnabled && scrollY > 150

  return (
    <main className="min-h-screen bg-bone">
      {/* Sticky Header */}
      <div
        className="sticky z-40 bg-bone transition-all duration-150"
        style={{
          top: 'env(safe-area-inset-top, 0px)',
          paddingTop: `${Math.max(8, 32 - scrollY / 5)}px`,
          paddingBottom: `${Math.max(8, 16 - scrollY / 10)}px`
        }}
      >
        <div className="max-w-lg mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="text-obsidian transition-all duration-150 origin-left"
                style={{
                  fontSize: `${Math.max(14, 18 * headerScale)}px`,
                  fontWeight: 500,
                  opacity: headerOpacity
                }}
              >
                Ringur
              </div>
              {userStreak && userStreak.current_streak > 0 && (
                <button
                  onClick={() => setShowStreakInfo(true)}
                  className="flex items-center gap-1.5 bg-bone-warm hover:bg-sun/10 px-2 py-1 rounded-md transition-all duration-150"
                  style={{ opacity: headerOpacity }}
                >
                  <StreakRing streakDays={userStreak.current_streak} />
                  <span className="text-body font-medium text-obsidian">{userStreak.current_streak}</span>
                </button>
              )}
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-ash hover:text-obsidian hover:bg-bone-warm rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {/* Menu Overlay */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-bone rounded-md shadow-elevated py-2 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowAddModal(true)
                    }}
                    className="w-full px-4 py-3 text-left text-obsidian hover:bg-bone-warm transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-moss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New connection
                  </button>
                  <Link
                    href="/forest"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 text-left text-obsidian hover:bg-bone-warm transition-colors flex items-center gap-3"
                  >
                    <span className="text-body">Forest</span>
                  </Link>
                  <Link
                    href="/reflect"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 text-left text-obsidian hover:bg-bone-warm transition-colors flex items-center gap-3"
                  >
                    <span className="text-body">Weekly Reflection</span>
                  </Link>
                  <div className="border-t border-bone-warm my-1"></div>
                  <Link
                    href="/settings"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 text-left text-obsidian hover:bg-bone-warm transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Compact progress ring - appears when full indicator scrolls past */}
          {habitEngineEnabled && (
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight: showCompactProgress ? '24px' : '0px',
                opacity: showCompactProgress ? 1 : 0,
                marginTop: showCompactProgress ? '8px' : '0px',
              }}
            >
              <div className="flex items-center gap-2">
                <CompactConnectionRing percent={progressPercent} color={getRingColor()} />
                <span className="text-micro text-ash">
                  {isValidDay ? 'Valid day' : totalWeight > 0 ? 'In progress' : 'No actions yet'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-safe">
        {/* Greeting */}
        <Greeting userName={user?.full_name} />

        {/* Daily Progress Indicator (Habit Engine V2) */}
        {habitEngineEnabled && (
          <DailyProgressIndicator
            totalWeight={todayHabitLog?.total_weight ?? 0}
            actionCount={todayHabitLog?.action_count ?? 0}
            highestAction={todayHabitLog?.highest_action ?? null}
            className="mb-4"
          />
        )}

        {/* Pending Catch-up Prompts */}
        {pendingIntents.length > 0 && (
          <div className="mb-4">
            {pendingIntents.slice(0, 2).map((pendingIntent) => (
              <PendingCatchupPrompt
                key={pendingIntent.intent.id}
                pendingIntent={pendingIntent}
                onRecordCatchup={() => {
                  setPendingIntentForLog(pendingIntent)
                  setSelectedConnection(pendingIntent.connection)
                  setShowLogModal(true)
                }}
                onDismiss={() => {
                  setPendingIntents(prev => prev.filter(p => p.intent.id !== pendingIntent.intent.id))
                }}
              />
            ))}
          </div>
        )}

        {/* Search and Sort Controls */}
        {connections.length > 0 && (
          <div className="mb-6 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ash"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections..."
                className="w-full px-4 py-3 pl-10 rounded-md border-none bg-bone-warm text-obsidian placeholder-ash focus:outline-none focus:ring-2 focus:ring-moss transition-all"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortMode('soonest')}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-colors ${
                  sortMode === 'soonest'
                    ? 'bg-moss text-bone'
                    : 'bg-bone-warm text-ash hover:bg-ash/10'
                }`}
              >
                Soonest
              </button>
              <button
                onClick={() => setSortMode('alphabetical')}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-colors ${
                  sortMode === 'alphabetical'
                    ? 'bg-moss text-bone'
                    : 'bg-bone-warm text-ash hover:bg-ash/10'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        )}

        {/* Connection Cards or Empty State */}
        {filteredConnections.length > 0 ? (
          <>
            <div className="space-y-4">
              {(showAllConnections || sortMode === 'alphabetical' ? filteredConnections : filteredConnections.slice(0, CONNECTIONS_TO_SHOW)).map((conn) => {
                const health = connectionHealthMap[conn.id]
                return (
                  <ConnectionCard
                    key={conn.id}
                    connection={conn}
                    lastMemory={lastMemories[conn.id]}
                    lastMood={lastMoods[conn.id] as 'happy' | 'neutral' | 'sad' | undefined}
                    onLogInteraction={() => handleLogInteraction(conn)}
                    onPlanCatchup={() => handlePlanCatchup(conn)}
                    onCatchup={() => handleCatchup(conn)}
                    onEdit={() => handleEdit(conn)}
                    onViewDetails={() => handleViewDetails(conn)}
                    strengthV2={health?.current_strength}
                    ringTier={health?.ring_tier}
                    ringPosition={health?.ring_position}
                  />
                )
              })}
            </div>

            {/* Show all button */}
            {filteredConnections.length > CONNECTIONS_TO_SHOW && !showAllConnections && sortMode !== 'alphabetical' && (
              <button
                onClick={() => setShowAllConnections(true)}
                className="mt-4 w-full py-3 px-4 bg-bone-warm hover:bg-ash/10 text-ash font-medium rounded-md transition-colors"
              >
                Show all ({filteredConnections.length} connections)
              </button>
            )}
          </>
        ) : connections.length > 0 && searchQuery.trim() ? (
          /* No search results state (we have connections but none match) */
          <div className="bg-bone rounded-lg p-8 shadow-card text-center">
            <h2 className="text-h3 font-medium text-obsidian mb-2">
              No matches found
            </h2>
            <p className="text-body text-ash mb-6">
              Try a different search term or{' '}
              <button
                onClick={() => setSearchQuery('')}
                className="text-moss hover:underline font-medium"
              >
                clear your search
              </button>
            </p>
          </div>
        ) : (
          /* No connections empty state */
          <div className="bg-bone rounded-lg p-8 shadow-card text-center">
            <h2 className="text-h3 font-medium text-obsidian mb-2">
              No connections yet
            </h2>
            <p className="text-body text-ash mb-6">
              Add someone you&apos;d like to stay in touch with.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="py-3 px-6 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-colors"
            >
              Add your first connection
            </button>
          </div>
        )}

        {/* Add Connection Button (when connections exist) */}
        {connections.length > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 w-full py-3 px-4 border-2 border-dashed border-bone-warm hover:border-moss/30 text-ash hover:text-moss font-medium rounded-md transition-colors"
          >
            + New connection
          </button>
        )}

        {/* Ringur Forest and Weekly Reflection */}
        {connections.length > 0 && (
          <>
            <Link
              href="/forest"
              className="mt-6 block bg-moss/10 rounded-md p-4 border border-moss/20 hover:bg-moss/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-body font-medium text-obsidian">Forest</div>
                  <div className="text-micro text-ash">View the health of all your relationships</div>
                </div>
              </div>
            </Link>

            <Link
              href="/reflect"
              className="mt-3 block bg-moss/10 rounded-md p-4 border border-moss/20 hover:bg-moss/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-body font-medium text-obsidian">Weekly reflection</div>
                  <div className="text-micro text-ash">Take a moment to reflect on your connections</div>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Modals */}
      {selectedConnection && (
        <>
          <LogInteractionModal
            connection={selectedConnection}
            isOpen={showLogModal}
            onClose={() => {
              setShowLogModal(false)
              setSelectedConnection(null)
              setPendingIntentForLog(null)
            }}
            onSuccess={handleLogSuccess}
            defaultInteractionType={pendingIntentForLog ? methodToInteractionType(pendingIntentForLog.intent.method) : undefined}
          />

          <EditConnectionModal
            connection={selectedConnection}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setSelectedConnection(null)
            }}
            onSuccess={handleEditSuccess}
          />

          <ConnectionDetailModal
            connection={selectedConnection}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false)
              setSelectedConnection(null)
            }}
            onEdit={() => {
              setShowDetailModal(false)
              setShowEditModal(true)
            }}
            onLogInteraction={() => {
              setShowDetailModal(false)
              setShowLogModal(true)
            }}
            onInteractionUpdated={loadData}
          />
        </>
      )}

      <AddConnectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      {selectedConnection && (
        <PlanCatchupModal
          connection={selectedConnection}
          isOpen={showPlanModal}
          onClose={() => {
            setShowPlanModal(false)
            setSelectedConnection(null)
          }}
          onSuccess={() => {
            setSelectedConnection(null)
            loadData()
          }}
        />
      )}

      {selectedConnection && (
        <CatchupMethodModal
          connection={selectedConnection}
          isOpen={showCatchupModal}
          onClose={() => {
            setShowCatchupModal(false)
            setSelectedConnection(null)
          }}
          onSuccess={() => {
            setShowCatchupModal(false)
            setSelectedConnection(null)
          }}
        />
      )}

      <AchievementUnlockModal
        achievements={newAchievements}
        isOpen={newAchievements.length > 0}
        onClose={() => setNewAchievements([])}
      />

      {/* Streak Info Modal */}
      {showStreakInfo && userStreak && (
        <div
          className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 pt-4 pb-safe"
          onClick={() => setShowStreakInfo(false)}
        >
          <div
            className="bg-bone rounded-lg w-full max-w-sm shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <StreakRing streakDays={userStreak.current_streak} size={64} />
              </div>
              <h2 className="text-h1 font-medium text-obsidian mb-2">
                {userStreak.current_streak} day streak
              </h2>
              <p className="text-body text-ash mb-4">
                You&apos;ve been catching up with your connections for {userStreak.current_streak} {userStreak.current_streak === 1 ? 'day' : 'days'} in a row.
              </p>

              {/* Next milestone */}
              {getNextMilestone(userStreak.current_streak) && (
                <div className="bg-sun/10 rounded-md p-4 mb-4">
                  <div className="text-body text-obsidian font-medium">
                    Next milestone: {getNextMilestone(userStreak.current_streak)} days
                  </div>
                  <div className="text-micro text-ash mt-1">
                    {getDaysToNextMilestone(userStreak.current_streak)} more {getDaysToNextMilestone(userStreak.current_streak) === 1 ? 'day' : 'days'} to go
                  </div>
                </div>
              )}

              {/* Longest streak */}
              {userStreak.longest_streak > userStreak.current_streak && (
                <div className="text-body text-ash mb-4">
                  Your longest streak: {userStreak.longest_streak} days
                </div>
              )}

              {/* How streaks work */}
              <div className="text-left bg-bone-warm rounded-md p-4 mb-4">
                <div className="text-body font-medium text-obsidian mb-2">How streaks work</div>
                <ul className="text-micro text-ash space-y-1">
                  <li>• Record a catch-up each day to keep your streak</li>
                  <li>• Miss a day? You get 1 free freeze per week</li>
                  <li>• Weekend flexibility: Fri-Sun counts as one window</li>
                  <li>• Unlock achievements at 7, 30, 90, 180 and 365 days</li>
                </ul>
              </div>

              <button
                onClick={() => setShowStreakInfo(false)}
                className="w-full py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-colors"
              >
                Quiet consistency
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function TodayPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-ash">Loading...</div>
      </main>
    }>
      <TodayPageContent />
    </Suspense>
  )
}
