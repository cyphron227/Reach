'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CatchupFrequency } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Growth stages based on relationship longevity and interaction frequency
type GrowthStage = 'seed' | 'seedling' | 'sapling' | 'young' | 'mature' | 'ancient'
type TreeHealth = 'thriving' | 'healthy' | 'needs_water' | 'wilting'

interface TreeStats {
  growthStage: GrowthStage
  health: TreeHealth
  daysSinceCreated: number
  daysSinceLastInteraction: number | null
  totalInteractions: number
  interactionFrequencyScore: number // 0-100, higher = more frequent
  longevityMonths: number
  isOverdue: boolean
  overdueByDays: number
}

const frequencyToDays: Record<CatchupFrequency, number> = {
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
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

function calculateTreeStats(
  connection: Connection,
  interactionCount: number
): TreeStats {
  const daysSinceCreated = getDaysSince(connection.created_at) || 0
  const daysSinceLastInteraction = getDaysSince(connection.last_interaction_date)
  const frequencyDays = frequencyToDays[connection.catchup_frequency]
  const longevityMonths = Math.floor(daysSinceCreated / 30)

  // Calculate if overdue
  const isOverdue = daysSinceLastInteraction !== null && daysSinceLastInteraction > frequencyDays
  const overdueByDays = isOverdue ? daysSinceLastInteraction! - frequencyDays : 0

  // Calculate interaction frequency score (0-100)
  // Based on how well they maintain the expected frequency
  let interactionFrequencyScore = 50
  if (daysSinceCreated > 0 && interactionCount > 0) {
    const expectedInteractions = Math.max(1, daysSinceCreated / frequencyDays)
    const frequencyRatio = interactionCount / expectedInteractions
    interactionFrequencyScore = Math.min(100, Math.max(0, frequencyRatio * 50))
  }

  // Determine growth stage based on longevity and interactions
  let growthStage: GrowthStage = 'seed'
  if (interactionCount === 0) {
    growthStage = 'seed'
  } else if (longevityMonths < 1 || interactionCount < 2) {
    growthStage = 'seedling'
  } else if (longevityMonths < 3 || interactionCount < 5) {
    growthStage = 'sapling'
  } else if (longevityMonths < 6 || interactionCount < 10) {
    growthStage = 'young'
  } else if (longevityMonths < 12 || interactionCount < 20) {
    growthStage = 'mature'
  } else {
    growthStage = 'ancient'
  }

  // Determine health based on overdue status
  let health: TreeHealth = 'healthy'
  if (daysSinceLastInteraction === null) {
    health = 'needs_water' // Never interacted
  } else if (overdueByDays > frequencyDays * 2) {
    health = 'wilting'
  } else if (overdueByDays > 0) {
    health = 'needs_water'
  } else if (daysSinceLastInteraction <= frequencyDays * 0.5) {
    health = 'thriving'
  }

  return {
    growthStage,
    health,
    daysSinceCreated,
    daysSinceLastInteraction,
    totalInteractions: interactionCount,
    interactionFrequencyScore,
    longevityMonths,
    isOverdue,
    overdueByDays,
  }
}

function getTimeAgoText(lastInteractionDate: string | null): string {
  const days = getDaysSince(lastInteractionDate)

  if (days === null) return 'Never caught-up'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return '1 month ago'
  return `${Math.floor(days / 30)} months ago`
}

// Tree visualization component with growth stages
function TreeVisualization({ stats, size = 'normal' }: { stats: TreeStats; size?: 'normal' | 'large' }) {
  const sizeClass = size === 'large' ? 'w-24 h-24' : 'w-16 h-16'
  const animationClass = stats.health === 'thriving' ? 'animate-sway' :
                         stats.health === 'healthy' ? 'animate-sway-slow' : ''

  // Generate tree rings based on longevity
  const ringCount = Math.min(5, Math.floor(stats.longevityMonths / 2))

  return (
    <div className={`relative ${sizeClass} flex items-center justify-center`}>
      {/* Tree rings background (for larger trees) */}
      {stats.growthStage !== 'seed' && stats.growthStage !== 'seedling' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: ringCount }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-muted-teal-200 animate-ring-pulse"
              style={{
                width: `${60 + i * 15}%`,
                height: `${60 + i * 15}%`,
                opacity: 0.2 + (i * 0.1),
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main tree emoji */}
      <div className={`relative z-10 ${animationClass}`}>
        {stats.growthStage === 'seed' && (
          <span className={size === 'large' ? 'text-6xl' : 'text-4xl'}>🫘</span>
        )}
        {stats.growthStage === 'seedling' && (
          <span className={size === 'large' ? 'text-6xl' : 'text-4xl'}>🌱</span>
        )}
        {stats.growthStage === 'sapling' && (
          <span className={size === 'large' ? 'text-6xl' : 'text-4xl'}>🌿</span>
        )}
        {stats.growthStage === 'young' && (
          <span className={size === 'large' ? 'text-6xl' : 'text-4xl'}>🌲</span>
        )}
        {stats.growthStage === 'mature' && (
          <span className={size === 'large' ? 'text-6xl' : 'text-4xl'}>🌳</span>
        )}
        {stats.growthStage === 'ancient' && (
          <span className={size === 'large' ? 'text-6xl' : 'text-4xl'}>🌴</span>
        )}
      </div>

      {/* Health indicator overlay */}
      {stats.health === 'wilting' && (
        <div className="absolute -top-1 -right-1 animate-leaf-fall">
          <span className="text-lg">🍂</span>
        </div>
      )}
      {stats.health === 'thriving' && (
        <div className="absolute -top-1 -right-1 animate-sparkle">
          <span className="text-sm">✨</span>
        </div>
      )}
      {stats.health === 'needs_water' && (
        <div className="absolute -top-1 -right-1">
          <span className="text-sm">💧</span>
        </div>
      )}
    </div>
  )
}

// Tree stats display for detail modal
function TreeStatsDisplay({ stats }: { stats: TreeStats }) {
  return (
    <div className="space-y-4">
      {/* Growth Progress */}
      <div className="bg-lavender-50 rounded-xl p-4">
        <div className="text-xs text-lavender-500 uppercase tracking-wide mb-2">Growth Stage</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {['seed', 'seedling', 'sapling', 'young', 'mature', 'ancient'].map((stage, i) => (
              <div
                key={stage}
                className={`w-2 h-6 rounded-full transition-all ${
                  i <= ['seed', 'seedling', 'sapling', 'young', 'mature', 'ancient'].indexOf(stats.growthStage)
                    ? 'bg-muted-teal-500'
                    : 'bg-lavender-200'
                }`}
                style={{ height: `${12 + i * 4}px` }}
              />
            ))}
          </div>
          <div className="text-sm font-medium text-lavender-800 capitalize">
            {stats.growthStage === 'seed' ? 'Seed' :
             stats.growthStage === 'seedling' ? 'Seedling' :
             stats.growthStage === 'sapling' ? 'Sapling' :
             stats.growthStage === 'young' ? 'Young Tree' :
             stats.growthStage === 'mature' ? 'Mature Tree' : 'Ancient Tree'}
          </div>
        </div>
      </div>

      {/* Tree Rings / Catch-up Stats */}
      <div className="bg-muted-teal-50 rounded-xl p-4">
        <div className="text-xs text-muted-teal-600 uppercase tracking-wide mb-3">Tree Rings</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-muted-teal-700">{stats.totalInteractions}</div>
            <div className="text-xs text-muted-teal-600">Total catch-ups</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-muted-teal-700">{stats.longevityMonths}</div>
            <div className="text-xs text-muted-teal-600">Months together</div>
          </div>
        </div>

        {/* Frequency meter */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-teal-600 mb-1">
            <span>Catch-up frequency</span>
            <span>{Math.round(stats.interactionFrequencyScore)}%</span>
          </div>
          <div className="h-2 bg-muted-teal-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-muted-teal-400 to-muted-teal-600 rounded-full transition-all"
              style={{ width: `${stats.interactionFrequencyScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className={`rounded-xl p-4 ${
        stats.health === 'thriving' ? 'bg-tea-green-50' :
        stats.health === 'healthy' ? 'bg-muted-teal-50' :
        stats.health === 'needs_water' ? 'bg-amber-50' : 'bg-red-50'
      }`}>
        <div className={`text-xs uppercase tracking-wide mb-2 ${
          stats.health === 'thriving' ? 'text-tea-green-600' :
          stats.health === 'healthy' ? 'text-muted-teal-600' :
          stats.health === 'needs_water' ? 'text-amber-600' : 'text-red-600'
        }`}>Health Status</div>
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {stats.health === 'thriving' && '🌟'}
            {stats.health === 'healthy' && '💚'}
            {stats.health === 'needs_water' && '💧'}
            {stats.health === 'wilting' && '🍂'}
          </span>
          <div>
            <div className={`font-medium capitalize ${
              stats.health === 'thriving' ? 'text-tea-green-700' :
              stats.health === 'healthy' ? 'text-muted-teal-700' :
              stats.health === 'needs_water' ? 'text-amber-700' : 'text-red-700'
            }`}>
              {stats.health === 'needs_water' ? 'Needs Water' : stats.health}
            </div>
            <div className={`text-xs ${
              stats.health === 'thriving' ? 'text-tea-green-600' :
              stats.health === 'healthy' ? 'text-muted-teal-600' :
              stats.health === 'needs_water' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {stats.isOverdue ? `${stats.overdueByDays} days overdue` : 'On track'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Habitat elements based on forest health
function ForestHabitat({ healthScore, totalTrees }: { healthScore: number; totalTrees: number }) {
  // healthScore: 0-100, higher = healthier forest
  const showSun = healthScore > 60
  const showRain = healthScore < 40 && totalTrees > 0
  const showButterflies = healthScore > 80
  const showMist = healthScore < 30

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Sun */}
      {showSun && (
        <div className="absolute top-4 right-8 animate-sun-rays">
          <div className="relative">
            <span className="text-4xl">☀️</span>
            <div className="absolute inset-0 bg-yellow-300/20 rounded-full blur-xl" />
          </div>
        </div>
      )}

      {/* Rain drops */}
      {showRain && (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-xl animate-rain"
              style={{
                left: `${15 + i * 18}%`,
                top: '-20px',
                animationDelay: `${i * 0.3}s`,
              }}
            >
              💧
            </div>
          ))}
        </>
      )}

      {/* Butterflies */}
      {showButterflies && (
        <>
          <div className="absolute top-20 left-10 animate-float text-2xl">🦋</div>
          <div className="absolute top-32 right-16 animate-float-delayed text-xl">🦋</div>
        </>
      )}

      {/* Mist for unhealthy forests */}
      {showMist && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-lavender-200/50 to-transparent" />
      )}

      {/* Ground moss/grass */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-muted-teal-200/30 to-transparent" />
    </div>
  )
}

interface TreeCardProps {
  connection: Connection
  stats: TreeStats
  onClick: () => void
}

function TreeCard({ connection, stats, onClick }: TreeCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-3 rounded-2xl hover:bg-white/70 transition-all group relative"
    >
      {/* Tree visualization */}
      <div className="relative mb-2 transform group-hover:scale-110 transition-transform">
        <TreeVisualization stats={stats} />
      </div>

      {/* Name */}
      <div className="text-sm font-medium text-lavender-800 text-center mb-0.5 truncate w-full">
        {connection.name}
      </div>

      {/* Status */}
      <div className={`text-xs text-center ${
        stats.health === 'wilting' ? 'text-red-500' :
        stats.health === 'needs_water' ? 'text-amber-600' : 'text-lavender-500'
      }`}>
        {getTimeAgoText(connection.last_interaction_date)}
      </div>

      {/* Overdue indicator */}
      {stats.isOverdue && (
        <div className="mt-1 text-xs text-amber-600 italic">
          {stats.overdueByDays} days overdue
        </div>
      )}
    </button>
  )
}

export default function ForestPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [interactionCounts, setInteractionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    // Fetch connections
    const { data: connectionsData } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', authUser.id)
      .order('name', { ascending: true })

    // Fetch interaction counts for each connection
    const { data: interactionsData } = await supabase
      .from('interactions')
      .select('connection_id')
      .eq('user_id', authUser.id)

    // Count interactions per connection
    const counts: Record<string, number> = {}
    if (interactionsData) {
      for (const interaction of interactionsData) {
        counts[interaction.connection_id] = (counts[interaction.connection_id] || 0) + 1
      }
    }

    setConnections(connectionsData || [])
    setInteractionCounts(counts)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate stats for all connections
  const treeStats = useMemo(() => {
    const stats: Record<string, TreeStats> = {}
    for (const conn of connections) {
      stats[conn.id] = calculateTreeStats(conn, interactionCounts[conn.id] || 0)
    }
    return stats
  }, [connections, interactionCounts])

  // Calculate forest health score (0-100)
  const forestHealthScore = useMemo(() => {
    if (connections.length === 0) return 50

    let score = 0
    for (const conn of connections) {
      const stats = treeStats[conn.id]
      if (stats.health === 'thriving') score += 100
      else if (stats.health === 'healthy') score += 75
      else if (stats.health === 'needs_water') score += 40
      else score += 10
    }
    return Math.round(score / connections.length)
  }, [connections, treeStats])

  // Count by growth stage
  const stageCounts = useMemo(() => {
    const counts = { seed: 0, seedling: 0, sapling: 0, young: 0, mature: 0, ancient: 0 }
    for (const conn of connections) {
      counts[treeStats[conn.id]?.growthStage || 'seed']++
    }
    return counts
  }, [connections, treeStats])

  // Count by health
  const healthCounts = useMemo(() => {
    const counts = { thriving: 0, healthy: 0, needs_water: 0, wilting: 0 }
    for (const conn of connections) {
      counts[treeStats[conn.id]?.health || 'healthy']++
    }
    return counts
  }, [connections, treeStats])

  const selectedStats = selectedConnection ? treeStats[selectedConnection.id] : null

  if (loading) {
    return (
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading your forest...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-lavender-50 via-muted-teal-50/30 to-lavender-50 relative">
      <ForestHabitat healthScore={forestHealthScore} totalTrees={connections.length} />

      <div className="max-w-2xl mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Today
          </Link>
          <div className="text-muted-teal-500 font-semibold text-lg">Your Ringur Forest</div>
          <div className="w-12" />
        </div>

        {/* Forest Health Overview */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm border border-lavender-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-lavender-800">Forest Health</h2>
              <p className="text-sm text-lavender-500">{connections.length} trees in your forest</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                forestHealthScore > 70 ? 'text-tea-green-600' :
                forestHealthScore > 40 ? 'text-muted-teal-600' : 'text-amber-600'
              }`}>
                {forestHealthScore}%
              </div>
              <div className="text-xs text-lavender-500">
                {forestHealthScore > 70 ? 'Flourishing' :
                 forestHealthScore > 40 ? 'Growing' : 'Needs care'}
              </div>
            </div>
          </div>

          {/* Health bar */}
          <div className="h-3 bg-lavender-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all ${
                forestHealthScore > 70 ? 'bg-gradient-to-r from-tea-green-400 to-tea-green-600' :
                forestHealthScore > 40 ? 'bg-gradient-to-r from-muted-teal-400 to-muted-teal-600' :
                'bg-gradient-to-r from-amber-400 to-amber-600'
              }`}
              style={{ width: `${forestHealthScore}%` }}
            />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 bg-tea-green-50 rounded-lg">
              <div className="text-lg font-semibold text-tea-green-600">{healthCounts.thriving}</div>
              <div className="text-xs text-tea-green-600">Thriving</div>
            </div>
            <div className="text-center p-2 bg-muted-teal-50 rounded-lg">
              <div className="text-lg font-semibold text-muted-teal-600">{healthCounts.healthy}</div>
              <div className="text-xs text-muted-teal-600">Healthy</div>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <div className="text-lg font-semibold text-amber-600">{healthCounts.needs_water}</div>
              <div className="text-xs text-amber-600">Needs water</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-500">{healthCounts.wilting}</div>
              <div className="text-xs text-red-500">Wilting</div>
            </div>
          </div>
        </div>

        {/* Growth Stages Legend */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-lavender-100 mb-6">
          <div className="text-xs text-lavender-500 uppercase tracking-wide mb-3">Growth Stages</div>
          <div className="flex justify-between items-end">
            {[
              { stage: 'seed', emoji: '🫘', label: 'Seed', count: stageCounts.seed },
              { stage: 'seedling', emoji: '🌱', label: 'Seedling', count: stageCounts.seedling },
              { stage: 'sapling', emoji: '🌿', label: 'Sapling', count: stageCounts.sapling },
              { stage: 'young', emoji: '🌲', label: 'Young', count: stageCounts.young },
              { stage: 'mature', emoji: '🌳', label: 'Mature', count: stageCounts.mature },
              { stage: 'ancient', emoji: '🌴', label: 'Ancient', count: stageCounts.ancient },
            ].map((item, i) => (
              <div key={item.stage} className="flex flex-col items-center">
                <span className={`text-${16 + i * 4}px mb-1`} style={{ fontSize: `${16 + i * 4}px` }}>
                  {item.emoji}
                </span>
                <div className="text-xs text-lavender-600">{item.count}</div>
                <div className="text-[10px] text-lavender-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Forest Grid */}
        {connections.length === 0 ? (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">🌿</div>
            <h2 className="text-lg font-semibold text-lavender-800 mb-2">
              Your forest is empty
            </h2>
            <p className="text-lavender-500 mb-6">
              Add connections to start growing your relationship forest.
            </p>
            <Link
              href="/"
              className="inline-block py-3 px-6 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
            >
              Go to Today
            </Link>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur rounded-2xl p-4 shadow-sm border border-lavender-100">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {connections.map((connection) => (
                <TreeCard
                  key={connection.id}
                  connection={connection}
                  stats={treeStats[connection.id]}
                  onClick={() => setSelectedConnection(connection)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connection Detail Modal */}
      {selectedConnection && selectedStats && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            {/* Header with tree visualization */}
            <div className={`p-6 ${
              selectedStats.health === 'thriving' ? 'bg-gradient-to-br from-tea-green-100 to-muted-teal-100' :
              selectedStats.health === 'healthy' ? 'bg-gradient-to-br from-muted-teal-100 to-lavender-100' :
              selectedStats.health === 'needs_water' ? 'bg-gradient-to-br from-amber-100 to-lavender-100' :
              'bg-gradient-to-br from-red-100 to-lavender-100'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <TreeVisualization stats={selectedStats} size="large" />
                  <div>
                    <h2 className="text-xl font-semibold text-lavender-800">
                      {selectedConnection.name}
                    </h2>
                    <div className="text-sm text-lavender-600">
                      {getTimeAgoText(selectedConnection.last_interaction_date)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedConnection(null)}
                  className="text-lavender-400 hover:text-lavender-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6">
              <TreeStatsDisplay stats={selectedStats} />

              {/* Catch-up frequency */}
              <div className="mt-4 p-3 bg-lavender-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-lavender-600">Catch-up frequency</span>
                  <span className="text-sm font-medium text-lavender-800">
                    {selectedConnection.catchup_frequency === 'weekly' && 'Weekly'}
                    {selectedConnection.catchup_frequency === 'biweekly' && 'Every 2 weeks'}
                    {selectedConnection.catchup_frequency === 'monthly' && 'Monthly'}
                    {selectedConnection.catchup_frequency === 'quarterly' && 'Every 3 months'}
                    {selectedConnection.catchup_frequency === 'biannually' && 'Every 6 months'}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/"
                onClick={() => setSelectedConnection(null)}
                className="mt-6 block w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors text-center"
              >
                Water this tree 💧
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
