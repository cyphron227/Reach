'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, Interaction, CatchupFrequency } from '@/types/database'

interface ConnectionDetailModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onLogInteraction: () => void
}

const frequencyLabels: Record<CatchupFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  biannually: 'Every 6 months',
}

const interactionTypeIcons: Record<string, string> = {
  call: '📞',
  text: '💬',
  in_person: '🤝',
  other: '✨',
}

const interactionTypeLabels: Record<string, string> = {
  call: 'Call',
  text: 'Text',
  in_person: 'In person',
  other: 'Other',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  }
  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

export default function ConnectionDetailModal({ connection, isOpen, onClose, onEdit, onLogInteraction }: ConnectionDetailModalProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchInteractions()
    }
  }, [isOpen, connection.id])

  const fetchInteractions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('connection_id', connection.id)
      .order('interaction_date', { ascending: false })
      .limit(50)

    setInteractions(data || [])
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-lavender-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-lavender-800">
              {connection.name}
            </h2>
            <button
              onClick={onClose}
              className="text-lavender-400 hover:text-lavender-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-lavender-500">
            <span>{frequencyLabels[connection.catchup_frequency]}</span>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onLogInteraction}
              className="flex-1 py-2.5 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Log interaction
            </button>
            <button
              onClick={onEdit}
              className="py-2.5 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 text-sm font-medium rounded-xl transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Interaction History */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-medium text-lavender-700 mb-4">Interaction History</h3>

          {loading ? (
            <div className="text-center py-8 text-lavender-400">Loading...</div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-lavender-500">No interactions yet</p>
              <p className="text-lavender-400 text-sm mt-1">Log your first interaction to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="p-4 bg-lavender-50 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{interactionTypeIcons[interaction.interaction_type]}</span>
                      <span className="text-sm font-medium text-lavender-700">
                        {interactionTypeLabels[interaction.interaction_type]}
                      </span>
                    </div>
                    <span className="text-sm text-lavender-400">
                      {formatDate(interaction.interaction_date)}
                    </span>
                  </div>
                  {interaction.memory && (
                    <p className="text-sm text-lavender-600 mt-2 pl-7">
                      {interaction.memory}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
