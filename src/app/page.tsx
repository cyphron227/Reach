'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, User } from '@/types/database'
import Greeting from '@/components/Greeting'
import ConnectionCard from '@/components/ConnectionCard'
import LogInteractionModal from '@/components/LogInteractionModal'
import AddConnectionModal from '@/components/AddConnectionModal'
import EditConnectionModal from '@/components/EditConnectionModal'
import ConnectionDetailModal from '@/components/ConnectionDetailModal'
import Link from 'next/link'

const CONNECTIONS_TO_SHOW = 3

export default function TodayPage() {
  const [user, setUser] = useState<User | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)

  const supabase = createClient()

  const fetchUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return null

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    return data
  }, [supabase])

  const fetchConnections = useCallback(async (): Promise<Connection[]> => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return []

    // Get connections with the oldest last_interaction_date
    // Null dates (never contacted) come first, then oldest dates
    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', authUser.id)
      .order('last_interaction_date', { ascending: true, nullsFirst: true })

    if (!data || data.length === 0) return []

    // Filter out skipped connections and take up to CONNECTIONS_TO_SHOW
    const visibleConnections = (data as Connection[])
      .filter(c => !skippedIds.has(c.id))
      .slice(0, CONNECTIONS_TO_SHOW)

    return visibleConnections
  }, [supabase, skippedIds])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [userData, connectionsData] = await Promise.all([
      fetchUser(),
      fetchConnections(),
    ])
    setUser(userData)
    setConnections(connectionsData)
    setLoading(false)
  }, [fetchUser, fetchConnections])

  useEffect(() => {
    loadData()
  }, [loadData])

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
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-warmgray-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-sage-500 font-semibold text-lg">Reach</div>
          <div className="flex items-center gap-4">
            <Link
              href="/forest"
              className="text-warmgray-400 hover:text-sage-600 text-sm transition-colors flex items-center gap-1"
            >
              <span>🌳</span> Forest
            </Link>
            <Link
              href="/settings"
              className="text-warmgray-400 hover:text-warmgray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Greeting */}
        <Greeting userName={user?.full_name} />

        {/* Connection Cards or Empty State */}
        {connections.length > 0 ? (
          <div className="space-y-4">
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                connection={conn}
                onLogInteraction={() => handleLogInteraction(conn)}
                onSkip={() => handleSkip(conn.id)}
                onEdit={() => handleEdit(conn)}
                onViewDetails={() => handleViewDetails(conn)}
              />
            ))}
          </div>
        ) : skippedIds.size > 0 ? (
          /* All caught up state */
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-warmgray-100 text-center">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-lg font-semibold text-warmgray-800 mb-2">
              All caught up for now
            </h2>
            <p className="text-warmgray-500 mb-6">
              You&apos;ve gone through everyone. Check back later or add more connections.
            </p>
            <button
              onClick={() => setSkippedIds(new Set())}
              className="py-3 px-6 bg-warmgray-100 hover:bg-warmgray-200 text-warmgray-600 font-medium rounded-xl transition-colors"
            >
              Start over
            </button>
          </div>
        ) : (
          /* No connections empty state */
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-warmgray-100 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-lg font-semibold text-warmgray-800 mb-2">
              No connections yet
            </h2>
            <p className="text-warmgray-500 mb-6">
              Add someone you&apos;d like to stay in touch with.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="py-3 px-6 bg-sage-400 hover:bg-sage-500 text-white font-medium rounded-xl transition-colors"
            >
              Add your first connection
            </button>
          </div>
        )}

        {/* Add Connection Button (when connections exist) */}
        {(connections.length > 0 || skippedIds.size > 0) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 w-full py-3 px-4 border-2 border-dashed border-warmgray-200 hover:border-sage-300 text-warmgray-500 hover:text-sage-600 font-medium rounded-xl transition-colors"
          >
            + Add another connection
          </button>
        )}

        {/* Weekly Reflection Prompt (shown on Sundays or can be accessed anytime) */}
        {connections.length > 0 && (
          <Link
            href="/reflect"
            className="mt-6 block bg-sage-50 rounded-xl p-4 border border-sage-100 hover:bg-sage-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💭</span>
              <div>
                <div className="text-sm font-medium text-sage-700">Weekly reflection</div>
                <div className="text-xs text-sage-600">Take a moment to reflect on your connections</div>
              </div>
            </div>
          </Link>
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
