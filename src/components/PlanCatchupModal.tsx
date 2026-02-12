'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection } from '@/types/database'
import { useScrollLock } from '@/lib/useScrollLock'

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

  // Lock body scroll when modal is open
  useScrollLock(isOpen)

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
    <div
      className="fixed inset-0 bg-obsidian/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pt-4 pb-safe overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white dark:bg-dark-surface rounded-lg w-full max-w-md shadow-modal max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h2 font-medium text-obsidian dark:text-dark-text-primary">
              Plan catch-up with {connection.name}
            </h2>
            <button
              onClick={onClose}
              className="text-text-tertiary dark:text-dark-text-tertiary hover:text-obsidian dark:hover:text-dark-text-primary transition-all duration-calm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Quick date options */}
            <div>
              <label className="block text-micro-medium text-text-tertiary dark:text-dark-text-tertiary mb-2">
                Quick select
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickDates.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setSelectedDate(option.date)}
                    className={`py-3 px-2 rounded-md text-center transition-all duration-calm ${
                      selectedDate === option.date
                        ? 'bg-moss text-bone'
                        : 'bg-bone-warm dark:bg-dark-surface-raised text-obsidian dark:text-dark-text-primary hover:bg-moss/10 dark:hover:bg-dark-moss-subtle'
                    }`}
                  >
                    <div className="text-label font-medium">{option.label}</div>
                    <div className="text-micro mt-0.5 opacity-75">{option.display}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date picker */}
            <div>
              <label htmlFor="catchupDate" className="block text-micro-medium text-text-tertiary dark:text-dark-text-tertiary mb-2">
                Or pick a date
              </label>
              <input
                id="catchupDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={formatDateForInput(today)}
                className="w-full bg-bone-warm dark:bg-dark-surface-raised border-none rounded-md px-4 py-3 text-body text-obsidian dark:text-dark-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
              />
            </div>

            {error && (
              <p className="text-bone text-body bg-ember p-3 rounded-md">{error}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedDate}
              className="w-full py-3 px-4 bg-moss hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving' : 'Set reminder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
