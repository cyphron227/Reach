'use client'

import { Connection, CatchupFrequency } from '@/types/database'

interface ConnectionCardProps {
  connection: Connection
  lastMemory?: string
  onLogInteraction: () => void
  onSkip: () => void
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
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
}

function getNextCatchupInfo(connection: Connection): { text: string; isOverdue: boolean } {
  // If there's an explicit next_catchup_date, use that
  if (connection.next_catchup_date) {
    const daysUntil = getDaysUntil(connection.next_catchup_date)
    if (daysUntil === null) return { text: '', isOverdue: false }
    if (daysUntil < 0) return { text: `${Math.abs(daysUntil)} days overdue`, isOverdue: true }
    if (daysUntil === 0) return { text: 'Catch up today', isOverdue: false }
    if (daysUntil === 1) return { text: 'Catch up tomorrow', isOverdue: false }
    if (daysUntil < 7) return { text: `Catch up in ${daysUntil} days`, isOverdue: false }
    if (daysUntil < 14) return { text: 'Catch up next week', isOverdue: false }
    return { text: `Catch up in ${Math.floor(daysUntil / 7)} weeks`, isOverdue: false }
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
  if (daysUntilDue === 0) return { text: 'Catch up today', isOverdue: false }
  if (daysUntilDue === 1) return { text: 'Catch up tomorrow', isOverdue: false }
  if (daysUntilDue < 7) return { text: `Catch up in ${daysUntilDue} days`, isOverdue: false }
  if (daysUntilDue < 14) return { text: 'Catch up next week', isOverdue: false }
  return { text: `Catch up in ${Math.floor(daysUntilDue / 7)} weeks`, isOverdue: false }
}

function getStatusText(lastInteractionDate: string | null): { text: string; isUrgent: boolean } {
  const days = getDaysSince(lastInteractionDate)

  if (days === null) {
    return { text: "You haven't connected yet", isUrgent: false }
  }

  if (days > 14) {
    return { text: "It's been a while", isUrgent: true }
  }

  if (days === 0) {
    return { text: "Connected today", isUrgent: false }
  }

  if (days === 1) {
    return { text: "Connected yesterday", isUrgent: false }
  }

  return { text: "Recently connected", isUrgent: false }
}

function getTimeAgoText(lastInteractionDate: string | null): string {
  const days = getDaysSince(lastInteractionDate)

  if (days === null) return ''
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return '1 month ago'
  return `${Math.floor(days / 30)} months ago`
}

export default function ConnectionCard({ connection, lastMemory, onLogInteraction, onSkip, onEdit, onViewDetails }: ConnectionCardProps) {
  const status = getStatusText(connection.last_interaction_date)
  const timeAgo = getTimeAgoText(connection.last_interaction_date)
  const nextCatchup = getNextCatchupInfo(connection)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={onViewDetails}
            className="text-xl font-semibold text-lavender-800 hover:text-muted-teal-600 transition-colors text-left"
          >
            {connection.name}
          </button>
          <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-lavender-500">
            {status.text}
          </span>
          {timeAgo && (
            <>
              <span className="text-lavender-300">·</span>
              <span className="text-sm text-lavender-400">{timeAgo}</span>
            </>
          )}
          {lastMemory && (
            <>
              <span className="text-lavender-300">·</span>
              <span className="text-sm text-lavender-500 italic line-clamp-1">&ldquo;{lastMemory}&rdquo;</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onLogInteraction}
          className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
        >
          Log interaction
        </button>
        <button
          onClick={onSkip}
          className="py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
