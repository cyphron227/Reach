'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CatchupFrequency } from '@/types/database'

interface EditConnectionModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const frequencyOptions: { value: CatchupFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'biannually', label: 'Every 6 months' },
]

export default function EditConnectionModal({ connection, isOpen, onClose, onSuccess }: EditConnectionModalProps) {
  const [name, setName] = useState(connection.name)
  const [relationship, setRelationship] = useState(connection.relationship || '')
  const [frequency, setFrequency] = useState<CatchupFrequency>(connection.catchup_frequency)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      setName(connection.name)
      setRelationship(connection.relationship || '')
      setFrequency(connection.catchup_frequency)
      setDeleteConfirm(false)
      setError(null)
    }
  }, [isOpen, connection])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('connections')
        .update({
          name: name.trim(),
          relationship: relationship.trim() || null,
          catchup_frequency: frequency,
        })
        .eq('id', connection.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('connections')
        .delete()
        .eq('id', connection.id)

      if (deleteError) throw deleteError

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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-warmgray-800">
              Edit connection
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-warmgray-700 mb-1">
                Their name
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="edit-relationship" className="block text-sm font-medium text-warmgray-700 mb-1">
                How do you know them? <span className="text-warmgray-400">(optional)</span>
              </label>
              <input
                id="edit-relationship"
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
                placeholder="e.g., College friend, Cousin, Coworker"
              />
            </div>

            <div>
              <label htmlFor="edit-frequency" className="block text-sm font-medium text-warmgray-700 mb-1">
                How often do you want to catch up?
              </label>
              <select
                id="edit-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as CatchupFrequency)}
                className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 py-3 px-4 bg-sage-400 hover:bg-sage-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            <div className="pt-4 border-t border-warmgray-100">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`w-full py-3 px-4 font-medium rounded-xl transition-colors disabled:opacity-50 ${
                  deleteConfirm
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-warmgray-100 hover:bg-warmgray-200 text-warmgray-600'
                }`}
              >
                {deleteConfirm ? 'Click again to confirm delete' : 'Delete connection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
