'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, Interaction, CatchupFrequency, InteractionType } from '@/types/database'

interface ConnectionDetailModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onLogInteraction: () => void
  onInteractionUpdated?: () => void
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

const interactionTypes: { value: InteractionType; label: string; icon: string }[] = [
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'text', label: 'Text', icon: '💬' },
  { value: 'in_person', label: 'In person', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '✨' },
]

export default function ConnectionDetailModal({ connection, isOpen, onClose, onEdit, onLogInteraction, onInteractionUpdated }: ConnectionDetailModalProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null)
  const [editType, setEditType] = useState<InteractionType>('call')
  const [editMemory, setEditMemory] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const startEditing = (interaction: Interaction) => {
    setEditingInteraction(interaction)
    setEditType(interaction.interaction_type)
    setEditMemory(interaction.memory || '')
    setEditDate(interaction.interaction_date)
    setShowDeleteConfirm(false)
  }

  const cancelEditing = () => {
    setEditingInteraction(null)
    setShowDeleteConfirm(false)
  }

  const saveEdit = async () => {
    if (!editingInteraction) return

    setSaving(true)
    const { error } = await supabase
      .from('interactions')
      .update({
        interaction_type: editType,
        memory: editMemory || null,
        interaction_date: editDate,
      })
      .eq('id', editingInteraction.id)

    if (!error) {
      await fetchInteractions()
      setEditingInteraction(null)
      onInteractionUpdated?.()
    }
    setSaving(false)
  }

  const deleteInteraction = async () => {
    if (!editingInteraction) return

    setSaving(true)
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', editingInteraction.id)

    if (!error) {
      await fetchInteractions()
      setEditingInteraction(null)
      setShowDeleteConfirm(false)
      onInteractionUpdated?.()
    }
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
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
              Record catch-up
            </button>
            <button
              onClick={onEdit}
              className="py-2.5 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 text-sm font-medium rounded-xl transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Catch-up History */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-medium text-lavender-700 mb-4">Catch-up history</h3>

          {loading ? (
            <div className="text-center py-8 text-lavender-400">Loading...</div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-lavender-500">No catch-ups yet</p>
              <p className="text-lavender-400 text-sm mt-1">Record your first catch-up to start tracking</p>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-lavender-400">
                        {formatDate(interaction.interaction_date)}
                      </span>
                      <button
                        onClick={() => startEditing(interaction)}
                        className="p-1 text-lavender-400 hover:text-lavender-600 hover:bg-lavender-100 rounded transition-colors"
                        title="Edit interaction"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
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

      {/* Edit Interaction Modal */}
      {editingInteraction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-lavender-800">
                  Edit catch-up
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-lavender-400 hover:text-lavender-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-lavender-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-lavender-700 mb-2">
                    Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {interactionTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setEditType(type.value)}
                        className={`py-2 px-2 rounded-xl text-center transition-all ${
                          editType === type.value
                            ? 'bg-muted-teal-400 text-white'
                            : 'bg-lavender-50 text-lavender-600 hover:bg-lavender-100'
                        }`}
                      >
                        <div className="text-lg mb-0.5">{type.icon}</div>
                        <div className="text-xs font-medium">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Memory */}
                <div>
                  <label className="block text-sm font-medium text-lavender-700 mb-2">
                    Memory
                  </label>
                  <textarea
                    value={editMemory}
                    onChange={(e) => setEditMemory(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all resize-none"
                    placeholder="What did you talk about?"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {/* Delete Section */}
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    Delete this catch-up
                  </button>
                ) : (
                  <div className="p-3 bg-red-50 rounded-xl">
                    <p className="text-sm text-red-600 mb-3">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 px-3 bg-white border border-lavender-200 text-lavender-600 text-sm font-medium rounded-lg hover:bg-lavender-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={deleteInteraction}
                        disabled={saving}
                        className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
