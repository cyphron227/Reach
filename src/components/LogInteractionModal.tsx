'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, InteractionType, Interaction } from '@/types/database'

interface LogInteractionModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const interactionTypes: { value: InteractionType; label: string; icon: string }[] = [
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'text', label: 'Text', icon: '💬' },
  { value: 'in_person', label: 'In person', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '✨' },
]

const interactionTypeLabels: Record<InteractionType, string> = {
  call: 'call',
  text: 'text',
  in_person: 'in-person meeting',
  other: 'interaction',
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return 'last week'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return 'last month'
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function LogInteractionModal({ connection, isOpen, onClose, onSuccess }: LogInteractionModalProps) {
  const [interactionType, setInteractionType] = useState<InteractionType>('call')
  const [memory, setMemory] = useState('')
  const [planNextCatchup, setPlanNextCatchup] = useState(false)
  const [nextCatchupDate, setNextCatchupDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastInteraction, setLastInteraction] = useState<Interaction | null>(null)
  const [loadingLastInteraction, setLoadingLastInteraction] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchLastInteraction()
    }
  }, [isOpen, connection.id])

  const fetchLastInteraction = async () => {
    setLoadingLastInteraction(true)
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('connection_id', connection.id)
      .order('interaction_date', { ascending: false })
      .limit(1)
      .single()

    setLastInteraction(data)
    setLoadingLastInteraction(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create the interaction record
      const { error: interactionError } = await supabase
        .from('interactions')
        .insert({
          connection_id: connection.id,
          user_id: user.id,
          interaction_type: interactionType,
          memory: memory || null,
          interaction_date: new Date().toISOString().split('T')[0],
        })

      if (interactionError) throw interactionError

      // Update the connection's last_interaction_date and optionally next_catchup_date
      const updateData: { last_interaction_date: string; next_catchup_date?: string | null } = {
        last_interaction_date: new Date().toISOString().split('T')[0],
      }

      if (planNextCatchup && nextCatchupDate) {
        updateData.next_catchup_date = nextCatchupDate
      } else if (!planNextCatchup) {
        updateData.next_catchup_date = null
      }

      const { error: updateError } = await supabase
        .from('connections')
        .update(updateData)
        .eq('id', connection.id)

      if (updateError) throw updateError

      // Reset form and close
      setInteractionType('call')
      setMemory('')
      setPlanNextCatchup(false)
      setNextCatchupDate('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-warmgray-800">
              Log interaction with {connection.name}
            </h2>
            <button
              onClick={onClose}
              className="text-warmgray-400 hover:text-warmgray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Last Memory Resurface */}
          {!loadingLastInteraction && lastInteraction?.memory && (
            <div className="mb-6 p-4 bg-sage-50 rounded-xl border border-sage-100">
              <div className="text-xs font-medium text-sage-600 mb-2">
                From your last {interactionTypeLabels[lastInteraction.interaction_type]} {formatRelativeDate(lastInteraction.interaction_date)}
              </div>
              <p className="text-sm text-warmgray-700 italic">
                &ldquo;{lastInteraction.memory}&rdquo;
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Interaction Type */}
            <div>
              <label className="block text-sm font-medium text-warmgray-700 mb-2">
                How did you connect?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {interactionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setInteractionType(type.value)}
                    className={`py-3 px-2 rounded-xl text-center transition-all ${
                      interactionType === type.value
                        ? 'bg-sage-400 text-white'
                        : 'bg-warmgray-50 text-warmgray-600 hover:bg-warmgray-100'
                    }`}
                  >
                    <div className="text-xl mb-1">{type.icon}</div>
                    <div className="text-xs font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Memory */}
            <div>
              <label htmlFor="memory" className="block text-sm font-medium text-warmgray-700 mb-2">
                Anything you want to remember?
              </label>
              <textarea
                id="memory"
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all resize-none"
                placeholder="e.g., They're moving to a new apartment next month..."
              />
            </div>

            {/* Plan Next Catchup */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={planNextCatchup}
                    onChange={(e) => setPlanNextCatchup(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all ${
                    planNextCatchup
                      ? 'bg-sage-400 border-sage-400'
                      : 'border-warmgray-300'
                  }`}>
                    {planNextCatchup && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-warmgray-700">Plan next catch-up</span>
              </label>

              {planNextCatchup && (
                <div className="mt-3 ml-8">
                  <input
                    type="date"
                    value={nextCatchupDate}
                    onChange={(e) => setNextCatchupDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-sage-400 hover:bg-sage-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save interaction'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
