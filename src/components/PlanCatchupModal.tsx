'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection } from '@/types/database'

interface PlanCatchupModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function PlanCatchupModal({ connection, isOpen, onClose, onSuccess }: PlanCatchupModalProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Get suggested dates
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const formatDateForInput = (date: Date) => date.toISOString().split('T')[0]
  const formatDateDisplay = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const quickDates = [
    { label: 'Today', date: formatDateForInput(today), display: formatDateDisplay(today) },
    { label: 'Tomorrow', date: formatDateForInput(tomorrow), display: formatDateDisplay(tomorrow) },
    { label: 'Next week', date: formatDateForInput(nextWeek), display: formatDateDisplay(nextWeek) },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate) return

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('connections')
        .update({ next_catchup_date: selectedDate })
        .eq('id', connection.id)

      if (updateError) throw updateError

      setSelectedDate('')
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
              Plan catch-up with {connection.name}
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Quick date options */}
            <div>
              <label className="block text-sm font-medium text-lavender-700 mb-2">
                Quick select
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickDates.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setSelectedDate(option.date)}
                    className={`py-3 px-2 rounded-xl text-center transition-all ${
                      selectedDate === option.date
                        ? 'bg-muted-teal-400 text-white'
                        : 'bg-lavender-50 text-lavender-600 hover:bg-lavender-100'
                    }`}
                  >
                    <div className="text-xs font-medium">{option.label}</div>
                    <div className="text-xs mt-0.5 opacity-75">{option.display}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date picker */}
            <div>
              <label htmlFor="catchupDate" className="block text-sm font-medium text-lavender-700 mb-2">
                Or pick a date
              </label>
              <input
                id="catchupDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={formatDateForInput(today)}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedDate}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Set reminder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
