'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, Interaction, CatchupFrequency, InteractionType } from '@/types/database'
import { useScrollLock } from '@/lib/useScrollLock'

interface ConnectionDetailModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onLogInteraction: () => void
  onInteractionUpdated?: () => void
}

const frequencyLabels: Record<CatchupFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  biannually: 'Every 6 months',
  annually: 'Annually',
}

const interactionTypeLabels: Record<string, string> = {
  call: 'Call',
  text: 'Message',
  in_person: 'In-person',
  other: 'Other',
}

const moodLabels: Record<string, string> = { happy: 'Good', neutral: 'Neutral', sad: 'Low' }

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

const interactionTypes: { value: InteractionType; label: string }[] = [
  { value: 'text', label: 'Message' },
  { value: 'call', label: 'Call' },
  { value: 'in_person', label: 'In-person' },
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

  // Lock body scroll when modal is open
  useScrollLock(isOpen)

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
      className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pt-4 pb-safe overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-bone rounded-lg w-full max-w-md max-h-[90vh] shadow-modal flex flex-col overscroll-contain"
      >
        {/* Header */}
        <div className="p-6 border-b border-bone-warm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-h2 font-medium text-obsidian">
              {connection.name}
            </h2>
            <button
              onClick={onClose}
              className="text-ash hover:text-obsidian transition-all duration-calm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 text-body text-ash">
            <span>{frequencyLabels[connection.catchup_frequency]}</span>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onLogInteraction}
              className="flex-1 py-2.5 px-4 bg-moss hover:bg-moss/90 text-bone text-body font-medium rounded-md transition-all duration-calm"
            >
              Record catch-up
            </button>
            <button
              onClick={onEdit}
              className="py-2.5 px-4 bg-bone-warm hover:shadow-card text-obsidian text-body font-medium rounded-md transition-all duration-calm"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Catch-up History */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-body font-medium text-obsidian mb-4">Catch-up history</h3>

          {loading ? (
            <div className="text-center py-8 text-ash">Loading...</div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-ash">No catch-ups yet</p>
              <p className="text-ash text-micro mt-1">Record your first catch-up to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="p-4 bg-bone-warm rounded-md shadow-card"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-obsidian">
                        {interactionTypeLabels[interaction.interaction_type]}
                      </span>
                      {interaction.mood && moodLabels[interaction.mood] && (
                        <span className="text-micro text-ash">({moodLabels[interaction.mood]})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-micro text-ash">
                        {formatDate(interaction.interaction_date)}
                      </span>
                      <button
                        onClick={() => startEditing(interaction)}
                        className="p-1 text-ash hover:text-obsidian hover:bg-bone rounded transition-all duration-calm"
                        title="Edit interaction"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {interaction.memory && (
                    <p className="text-body text-obsidian mt-2 pl-0">
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
        <div className="fixed inset-0 bg-obsidian/60 flex items-center justify-center z-[60] px-4 pt-4 pb-safe">
          <div className="bg-bone rounded-lg w-full max-w-sm shadow-modal">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-h3 font-medium text-obsidian">
                  Edit catch-up
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-ash hover:text-obsidian transition-all duration-calm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-body font-medium text-obsidian mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-bone-warm border-none rounded-md px-4 py-3 text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-moss/30 transition-all duration-calm"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-body font-medium text-obsidian mb-2">
                    Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {interactionTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setEditType(type.value)}
                        className={`py-2 px-2 rounded-md text-center transition-all duration-calm ${
                          editType === type.value
                            ? 'bg-moss text-bone shadow-card'
                            : 'bg-bone-warm text-obsidian hover:shadow-card'
                        }`}
                      >
                        <div className="text-micro font-medium">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Memory */}
                <div>
                  <label className="block text-body font-medium text-obsidian mb-2">
                    Memory
                  </label>
                  <textarea
                    value={editMemory}
                    onChange={(e) => setEditMemory(e.target.value)}
                    rows={3}
                    className="w-full bg-bone-warm border-none rounded-md px-4 py-3 text-body text-obsidian placeholder:text-ash focus:outline-none focus:ring-1 focus:ring-moss/30 transition-all duration-calm resize-none"
                    placeholder="What did you talk about?"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {/* Delete Section */}
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2 text-body text-ember hover:text-ember/80 transition-all duration-calm"
                  >
                    Delete this catch-up
                  </button>
                ) : (
                  <div className="p-3 bg-bone-warm rounded-md">
                    <p className="text-body text-ember mb-3">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 px-3 bg-bone shadow-card text-obsidian text-body font-medium rounded-md hover:shadow-elevated transition-all duration-calm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={deleteInteraction}
                        disabled={saving}
                        className="flex-1 py-2 px-3 bg-ember hover:bg-ember/90 text-bone text-body font-medium rounded-md transition-all duration-calm disabled:opacity-40"
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
