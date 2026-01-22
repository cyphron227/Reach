'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CatchupFrequency } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type TreeHealth = 'healthy' | 'needs_attention' | 'seedling'

const frequencyToDays: Record<CatchupFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
}

function getTreeHealth(connection: Connection): TreeHealth {
  // Seedling: never interacted
  if (!connection.last_interaction_date) {
    return 'seedling'
  }

  const lastDate = new Date(connection.last_interaction_date)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  const frequencyDays = frequencyToDays[connection.catchup_frequency]

  // Healthy: within their frequency window
  if (daysSince <= frequencyDays) {
    return 'healthy'
  }

  // Needs attention: overdue
  return 'needs_attention'
}

function getDaysSince(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

function getTimeAgoText(lastInteractionDate: string | null): string {
  const days = getDaysSince(lastInteractionDate)

  if (days === null) return 'Never connected'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return '1 month ago'
  return `${Math.floor(days / 30)} months ago`
}

interface TreeProps {
  connection: Connection
  health: TreeHealth
  onClick: () => void
}

function Tree({ connection, health, onClick }: TreeProps) {
  const daysSince = getDaysSince(connection.last_interaction_date)
  const frequencyDays = frequencyToDays[connection.catchup_frequency]
  const isOverdue = daysSince !== null && daysSince > frequencyDays

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 rounded-2xl hover:bg-white/50 transition-all group"
    >
      {/* Tree visualization */}
      <div className="relative mb-3">
        {health === 'seedling' && (
          <div className="text-5xl transform group-hover:scale-110 transition-transform">
            🌱
          </div>
        )}
        {health === 'healthy' && (
          <div className="text-5xl transform group-hover:scale-110 transition-transform">
            🌳
          </div>
        )}
        {health === 'needs_attention' && (
          <div className="text-5xl transform group-hover:scale-110 transition-transform opacity-70">
            🍂
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-sm font-medium text-lavender-800 text-center mb-1">
        {connection.name}
      </div>

      {/* Status */}
      <div className={`text-xs text-center ${
        health === 'needs_attention' ? 'text-amber-600' : 'text-lavender-500'
      }`}>
        {getTimeAgoText(connection.last_interaction_date)}
      </div>

      {/* "It's been a while" prompt */}
      {isOverdue && (
        <div className="mt-1 text-xs text-amber-600 italic">
          It&apos;s been a while
        </div>
      )}
    </button>
  )
}

export default function ForestPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
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

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const healthyCount = connections.filter(c => getTreeHealth(c) === 'healthy').length
  const needsAttentionCount = connections.filter(c => getTreeHealth(c) === 'needs_attention').length
  const seedlingCount = connections.filter(c => getTreeHealth(c) === 'seedling').length

  if (loading) {
    return (
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading your forest...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-lavender-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
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
          <div className="text-muted-teal-500 font-semibold text-lg">Your Forest</div>
          <div className="w-12" /> {/* Spacer for centering */}
        </div>

        {/* Forest Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-lavender-100">
            <div className="text-2xl mb-1">🌳</div>
            <div className="text-2xl font-semibold text-muted-teal-600">{healthyCount}</div>
            <div className="text-xs text-lavender-500">Healthy</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-lavender-100">
            <div className="text-2xl mb-1">🍂</div>
            <div className="text-2xl font-semibold text-amber-600">{needsAttentionCount}</div>
            <div className="text-xs text-lavender-500">Need attention</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-lavender-100">
            <div className="text-2xl mb-1">🌱</div>
            <div className="text-2xl font-semibold text-lavender-600">{seedlingCount}</div>
            <div className="text-xs text-lavender-500">Seedlings</div>
          </div>
        </div>

        {/* Forest Grid */}
        {connections.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {connections.map((connection) => (
                <Tree
                  key={connection.id}
                  connection={connection}
                  health={getTreeHealth(connection)}
                  onClick={() => setSelectedConnection(connection)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex justify-center gap-6 text-xs text-lavender-500">
          <div className="flex items-center gap-1">
            <span>🌳</span> Healthy
          </div>
          <div className="flex items-center gap-1">
            <span>🍂</span> Needs attention
          </div>
          <div className="flex items-center gap-1">
            <span>🌱</span> Seedling
          </div>
        </div>
      </div>

      {/* Connection Detail Popup */}
      {selectedConnection && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {getTreeHealth(selectedConnection) === 'seedling' && '🌱'}
                  {getTreeHealth(selectedConnection) === 'healthy' && '🌳'}
                  {getTreeHealth(selectedConnection) === 'needs_attention' && '🍂'}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-lavender-800">
                    {selectedConnection.name}
                  </h2>
                  {selectedConnection.relationship && (
                    <p className="text-sm text-lavender-500">{selectedConnection.relationship}</p>
                  )}
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

            <div className="space-y-2 mb-6 text-sm text-lavender-600">
              <p>
                <span className="text-lavender-400">Last interaction:</span>{' '}
                {getTimeAgoText(selectedConnection.last_interaction_date)}
              </p>
              <p>
                <span className="text-lavender-400">Catch-up frequency:</span>{' '}
                {selectedConnection.catchup_frequency === 'weekly' && 'Weekly'}
                {selectedConnection.catchup_frequency === 'biweekly' && 'Every 2 weeks'}
                {selectedConnection.catchup_frequency === 'monthly' && 'Monthly'}
                {selectedConnection.catchup_frequency === 'quarterly' && 'Every 3 months'}
                {selectedConnection.catchup_frequency === 'biannually' && 'Every 6 months'}
              </p>
            </div>

            <Link
              href="/"
              onClick={() => setSelectedConnection(null)}
              className="block w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors text-center"
            >
              Reach out today
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
