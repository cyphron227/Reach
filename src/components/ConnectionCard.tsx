'use client'

import { Connection, CatchupFrequency } from '@/types/database'

interface ConnectionCardProps {
  connection: Connection
  lastMemory?: string
  onLogInteraction: () => void
  onPlanCatchup: () => void
  onCatchup: () => void
  onEdit: () => void
  onViewDetails: () => void
}

function getDaysSince(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

function getDaysUntil(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const frequencyToDays: Record<CatchupFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
  annually: 365,
}

function getNextCatchupInfo(connection: Connection): { text: string; isOverdue: boolean } {
  // If there's an explicit next_catchup_date, use that
  if (connection.next_catchup_date) {
    const daysUntil = getDaysUntil(connection.next_catchup_date)
    if (daysUntil === null) return { text: '', isOverdue: false }
    if (daysUntil < 0) return { text: `${Math.abs(daysUntil)} days overdue`, isOverdue: true }
    if (daysUntil === 0) return { text: 'Catch-up today', isOverdue: false }
    if (daysUntil === 1) return { text: 'Catch-up tomorrow', isOverdue: false }
    if (daysUntil < 7) return { text: `Catch-up in ${daysUntil} days`, isOverdue: false }
    if (daysUntil < 14) return { text: 'Catch-up next week', isOverdue: false }
    return { text: `Catch-up in ${Math.floor(daysUntil / 7)} weeks`, isOverdue: false }
  }

  // Otherwise calculate based on last interaction + frequency
  if (!connection.last_interaction_date) {
    return { text: 'Reach out anytime', isOverdue: false }
  }

  const daysSince = getDaysSince(connection.last_interaction_date)
  if (daysSince === null) return { text: '', isOverdue: false }

  const frequencyDays = frequencyToDays[connection.catchup_frequency]
  const daysUntilDue = frequencyDays - daysSince

  if (daysUntilDue < 0) return { text: `${Math.abs(daysUntilDue)} days overdue`, isOverdue: true }
  if (daysUntilDue === 0) return { text: 'Catch-up today', isOverdue: false }
  if (daysUntilDue === 1) return { text: 'Catch-up tomorrow', isOverdue: false }
  if (daysUntilDue < 7) return { text: `Catch-up in ${daysUntilDue} days`, isOverdue: false }
  if (daysUntilDue < 14) return { text: 'Catch-up next week', isOverdue: false }
  return { text: `Catch-up in ${Math.floor(daysUntilDue / 7)} weeks`, isOverdue: false }
}

function getConnectionStatusText(lastInteractionDate: string | null): { text: string; isUrgent: boolean } {
  const days = getDaysSince(lastInteractionDate)

  if (days === null) {
    return { text: "You haven't caught-up yet", isUrgent: false }
  }

  if (days > 14) {
    return { text: "It's been a while", isUrgent: true }
  }

  if (days === 0) {
    return { text: "Caught-up today", isUrgent: false }
  }

  if (days === 1) {
    return { text: "Caught-up yesterday", isUrgent: false }
  }

  return { text: `Caught-up ${days} days ago`, isUrgent: false }
}

export default function ConnectionCard({ connection, lastMemory, onLogInteraction, onPlanCatchup, onCatchup, onEdit, onViewDetails }: ConnectionCardProps) {
  const status = getConnectionStatusText(connection.last_interaction_date)
  const nextCatchup = getNextCatchupInfo(connection)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
      {/* Clickable area for viewing details */}
      <button
        onClick={onViewDetails}
        className="w-full text-left mb-4 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xl font-semibold text-lavender-800">
            {connection.name}
          </span>
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              className="p-1.5 text-lavender-400 hover:text-lavender-600 hover:bg-lavender-100 rounded-lg transition-colors"
              title="Edit connection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>

        {nextCatchup.text && (
          <div className={`text-sm font-bold ${nextCatchup.isOverdue ? 'text-red-500' : 'text-muted-teal-600'}`}>
            {nextCatchup.text}
          </div>
        )}

        <div className="text-sm text-lavender-500 mt-1">
          {status.text}
        </div>

        {lastMemory && (
          <div className="text-sm text-lavender-500 italic mt-2 line-clamp-3">
            &ldquo;{lastMemory}&rdquo;
          </div>
        )}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onPlanCatchup}
          className="py-2.5 px-3 bg-lavender-100 hover:bg-lavender-200 text-lavender-700 text-sm font-medium rounded-xl transition-colors"
        >
          Plan
        </button>
        <button
          onClick={onCatchup}
          className="py-2.5 px-3 bg-muted-teal-500 hover:bg-muted-teal-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Catch-up
        </button>
        <button
          onClick={onLogInteraction}
          className="py-2.5 px-3 bg-lavender-100 hover:bg-lavender-200 text-lavender-700 text-sm font-medium rounded-xl transition-colors"
        >
          Record
        </button>
      </div>
    </div>
  )
}
