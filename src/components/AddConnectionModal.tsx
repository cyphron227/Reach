'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CatchupFrequency } from '@/types/database'

interface AddConnectionModalProps {
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

export default function AddConnectionModal({ isOpen, onClose, onSuccess }: AddConnectionModalProps) {
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<CatchupFrequency>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          name: name.trim(),
          catchup_frequency: frequency,
        })

      if (insertError) throw insertError

      setName('')
      setFrequency('monthly')
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
            <h2 className="text-xl font-semibold text-lavender-800">
              New connection
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-lavender-700 mb-1">
                Their name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                placeholder="e.g., Sarah"
              />
            </div>

            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-lavender-700 mb-1">
                How often do you want to catch-up?
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as CatchupFrequency)}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
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

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add connection'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
