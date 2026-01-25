'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, User } from '@/types/database'
import Greeting from '@/components/Greeting'
import ConnectionCard from '@/components/ConnectionCard'
import LogInteractionModal from '@/components/LogInteractionModal'
import AddConnectionModal from '@/components/AddConnectionModal'
import EditConnectionModal from '@/components/EditConnectionModal'
import ConnectionDetailModal from '@/components/ConnectionDetailModal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  isCapacitor,
  requestNotificationPermissions,
  scheduleConnectionNotifications,
  registerNotificationTapListener,
} from '@/lib/capacitor'

const CONNECTIONS_TO_SHOW = 3

// Helper functions for priority calculation
const frequencyToDays: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
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

export default function TodayPage() {
  const [user, setUser] = useState<User | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [lastMemories, setLastMemories] = useState<Record<string, string>>({})
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [showAllConnections, setShowAllConnections] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortMode, setSortMode] = useState<'soonest' | 'alphabetical'>('soonest')
  const [scrollY, setScrollY] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [notificationConnectionId, setNotificationConnectionId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const router = useRouter()

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

    return data
  }, [supabase, router])

  const fetchConnections = useCallback(async (): Promise<Connection[]> => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return []

    // Get all connections
    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', authUser.id)

    if (!data || data.length === 0) return []

    let processedConnections = data as Connection[]

    // Apply search filter
    if (searchQuery.trim()) {
      processedConnections = processedConnections.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    }

    // Apply sort
    processedConnections = sortMode === 'soonest'
      ? processedConnections.sort((a, b) => calculatePriorityScore(a) - calculatePriorityScore(b))
      : processedConnections.sort((a, b) => a.name.localeCompare(b.name))

    // Filter out skipped connections
    const visibleConnections = processedConnections.filter(c => !skippedIds.has(c.id))

    return visibleConnections
  }, [supabase, skippedIds, searchQuery, sortMode])

  const fetchLastMemories = useCallback(async (connectionIds: string[]): Promise<Record<string, string>> => {
    if (connectionIds.length === 0) return {}

    // Get the last interaction with a memory for each connection
    const { data } = await supabase
      .from('interactions')
      .select('connection_id, memory')
      .in('connection_id', connectionIds)
      .not('memory', 'is', null)
      .order('interaction_date', { ascending: false })

    if (!data) return {}

    // Build a map of connection_id -> last memory (first one found per connection since sorted desc)
    const memories: Record<string, string> = {}
    for (const interaction of data) {
      if (!memories[interaction.connection_id] && interaction.memory) {
        memories[interaction.connection_id] = interaction.memory
      }
    }

    return memories
  }, [supabase])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [userData, connectionsData] = await Promise.all([
      fetchUser(),
      fetchConnections(),
    ])
    setUser(userData)
    setConnections(connectionsData)

    // Fetch last memories for all connections
    if (connectionsData.length > 0) {
      const connectionIds = connectionsData.map(c => c.id)
      const memories = await fetchLastMemories(connectionIds)
      setLastMemories(memories)
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
  }, [fetchUser, fetchConnections, fetchLastMemories, supabase])

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

  const handleSkip = (connectionId: string) => {
    setSkippedIds(prev => new Set(Array.from(prev).concat(connectionId)))
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

  // Re-fetch connections when skippedIds changes
  useEffect(() => {
    if (skippedIds.size > 0) {
      fetchConnections().then(setConnections)
    }
  }, [skippedIds, fetchConnections])

  const handleLogSuccess = () => {
    setSkippedIds(new Set())
    setSelectedConnection(null)
    setShowAllConnections(false)
    setSearchQuery('')
    loadData()
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
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading...</div>
      </main>
    )
  }

  // Calculate header shrink based on scroll
  const headerScale = Math.max(0.7, 1 - scrollY / 200)
  const headerOpacity = Math.max(0.85, 1 - scrollY / 300)

  return (
    <main className="min-h-screen bg-lavender-50">
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-50 bg-lavender-50 transition-all duration-150"
        style={{
          paddingTop: `${Math.max(8, 32 - scrollY / 5)}px`,
          paddingBottom: `${Math.max(8, 16 - scrollY / 10)}px`
        }}
      >
        <div className="max-w-lg mx-auto px-6">
          <div className="flex items-center justify-between">
            <div
              className="text-muted-teal-500 font-semibold transition-all duration-150 origin-left"
              style={{
                fontSize: `${Math.max(14, 18 * headerScale)}px`,
                opacity: headerOpacity
              }}
            >
              Ringur
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-lavender-400 hover:text-lavender-600 hover:bg-lavender-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {/* Menu Overlay */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-lavender-100 py-2 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowAddModal(true)
                    }}
                    className="w-full px-4 py-3 text-left text-lavender-700 hover:bg-lavender-50 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-muted-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Contact
                  </button>
                  <Link
                    href="/forest"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 text-left text-lavender-700 hover:bg-lavender-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">🌳</span>
                    Ringur Forest
                  </Link>
                  <Link
                    href="/reflect"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 text-left text-lavender-700 hover:bg-lavender-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">💭</span>
                    Weekly Reflection
                  </Link>
                  <div className="border-t border-lavender-100 my-1"></div>
                  <Link
                    href="/settings"
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 text-left text-lavender-700 hover:bg-lavender-50 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 text-lavender-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-8">
        {/* Greeting */}
        <Greeting userName={user?.full_name} />

        {/* Search and Sort Controls */}
        {(connections.length > 0 || skippedIds.size > 0) && (
          <div className="mb-6 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-lavender-400"
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
                className="w-full px-4 py-3 pl-10 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortMode('soonest')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors ${
                  sortMode === 'soonest'
                    ? 'bg-muted-teal-500 text-white'
                    : 'bg-lavender-100 text-lavender-600 hover:bg-lavender-200'
                }`}
              >
                Soonest
              </button>
              <button
                onClick={() => setSortMode('alphabetical')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors ${
                  sortMode === 'alphabetical'
                    ? 'bg-muted-teal-500 text-white'
                    : 'bg-lavender-100 text-lavender-600 hover:bg-lavender-200'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        )}

        {/* Connection Cards or Empty State */}
        {connections.length > 0 ? (
          <>
            <div className="space-y-4">
              {(showAllConnections || sortMode === 'alphabetical' ? connections : connections.slice(0, CONNECTIONS_TO_SHOW)).map((conn) => (
                <ConnectionCard
                  key={conn.id}
                  connection={conn}
                  lastMemory={lastMemories[conn.id]}
                  onLogInteraction={() => handleLogInteraction(conn)}
                  onSkip={() => handleSkip(conn.id)}
                  onEdit={() => handleEdit(conn)}
                  onViewDetails={() => handleViewDetails(conn)}
                />
              ))}
            </div>

            {/* Show all button */}
            {connections.length > CONNECTIONS_TO_SHOW && !showAllConnections && sortMode !== 'alphabetical' && (
              <button
                onClick={() => setShowAllConnections(true)}
                className="mt-4 w-full py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
              >
                Show all ({connections.length} connections)
              </button>
            )}
          </>
        ) : searchQuery.trim() ? (
          /* No search results state */
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-lg font-semibold text-lavender-800 mb-2">
              No matches found
            </h2>
            <p className="text-lavender-500 mb-6">
              Try a different search term or{' '}
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-teal-600 hover:underline font-medium"
              >
                clear your search
              </button>
            </p>
          </div>
        ) : skippedIds.size > 0 ? (
          /* All caught up state */
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-lg font-semibold text-lavender-800 mb-2">
              All caught up for now
            </h2>
            <p className="text-lavender-500 mb-6">
              You&apos;ve gone through everyone. Check back later or add more connections.
            </p>
            <button
              onClick={() => setSkippedIds(new Set())}
              className="py-3 px-6 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
            >
              Start over
            </button>
          </div>
        ) : (
          /* No connections empty state */
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-lg font-semibold text-lavender-800 mb-2">
              No connections yet
            </h2>
            <p className="text-lavender-500 mb-6">
              Add someone you&apos;d like to stay in touch with.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="py-3 px-6 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
            >
              Add your first connection
            </button>
          </div>
        )}

        {/* Add Connection Button (when connections exist) */}
        {(connections.length > 0 || skippedIds.size > 0) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 w-full py-3 px-4 border-2 border-dashed border-lavender-200 hover:border-muted-teal-300 text-lavender-500 hover:text-muted-teal-600 font-medium rounded-xl transition-colors"
          >
            + Add New Contact
          </button>
        )}

        {/* Ringur Forest and Weekly Reflection */}
        {connections.length > 0 && (
          <>
            <Link
              href="/forest"
              className="mt-6 block bg-muted-teal-50 rounded-xl p-4 border border-muted-teal-100 hover:bg-muted-teal-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌳</span>
                <div>
                  <div className="text-sm font-medium text-muted-teal-700">Ringur Forest</div>
                  <div className="text-xs text-muted-teal-600">View the health of all your relationships</div>
                </div>
              </div>
            </Link>

            <Link
              href="/reflect"
              className="mt-3 block bg-muted-teal-50 rounded-xl p-4 border border-muted-teal-100 hover:bg-muted-teal-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💭</span>
                <div>
                  <div className="text-sm font-medium text-muted-teal-700">Weekly reflection</div>
                  <div className="text-xs text-muted-teal-600">Take a moment to reflect on your connections</div>
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
            }}
            onSuccess={handleLogSuccess}
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
          />
        </>
      )}

      <AddConnectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </main>
  )
}
