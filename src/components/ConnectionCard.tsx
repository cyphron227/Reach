'use client'

import { Connection, CatchupFrequency } from '@/types/database'

interface ConnectionCardProps {
  connection: Connection
  lastMemory?: string
  onLogInteraction: () => void
  onPlanCatchup: () => void
  onEdit: () => void
  onViewDetails: () => void
}

type TreeHealth = 'thriving' | 'healthy' | 'needs_water' | 'wilting'
type GrowthStage = 'seed' | 'seedling' | 'sapling' | 'young' | 'mature' | 'ancient'

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

function getTreeHealth(connection: Connection): TreeHealth {
  const daysSinceLastInteraction = getDaysSince(connection.last_interaction_date)
  const frequencyDays = frequencyToDays[connection.catchup_frequency]

  if (daysSinceLastInteraction === null) {
    return 'needs_water' // Never interacted
  }

  const overdueByDays = Math.max(0, daysSinceLastInteraction - frequencyDays)

  if (overdueByDays > frequencyDays * 2) {
    return 'wilting'
  } else if (overdueByDays > 0) {
    return 'needs_water'
  } else if (daysSinceLastInteraction <= frequencyDays * 0.5) {
    return 'thriving'
  }
  return 'healthy'
}

function getGrowthStage(connection: Connection): GrowthStage {
  const daysSinceCreated = getDaysSince(connection.created_at) || 0
  const hasInteracted = connection.last_interaction_date !== null
  const longevityMonths = Math.floor(daysSinceCreated / 30)

  if (!hasInteracted) {
    return 'seed'
  } else if (longevityMonths < 1) {
    return 'seedling'
  } else if (longevityMonths < 3) {
    return 'sapling'
  } else if (longevityMonths < 6) {
    return 'young'
  } else if (longevityMonths < 12) {
    return 'mature'
  }
  return 'ancient'
}

// SVG tree background based on health and growth stage
function TreeBackground({ health, stage }: { health: TreeHealth; stage: GrowthStage }) {
  const colors = {
    thriving: { trunk: '#6B8E6B', leaves: '#8FBC8F', accent: '#98D998' },
    healthy: { trunk: '#7BA37B', leaves: '#A8D4A8', accent: '#B5DEB5' },
    needs_water: { trunk: '#C4A35A', leaves: '#E6D390', accent: '#DBC878' },
    wilting: { trunk: '#A67B5B', leaves: '#C9A882', accent: '#B8956F' },
  }

  const c = colors[health]

  // Seed stage - just a small seed
  if (stage === 'seed') {
    return (
      <svg
        className="absolute right-2 top-2 w-16 h-16 opacity-[0.25] pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
      >
        <ellipse cx="50" cy="55" rx="12" ry="16" fill={c.trunk} />
        <ellipse cx="50" cy="52" rx="8" ry="10" fill={c.leaves} opacity="0.5" />
      </svg>
    )
  }

  // Seedling stage - small sprout
  if (stage === 'seedling') {
    return (
      <svg
        className="absolute right-2 top-2 w-18 h-18 opacity-[0.25] pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
      >
        <path d="M50 85 L50 55" stroke={c.trunk} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="50" cy="45" rx="15" ry="18" fill={c.leaves} />
        <ellipse cx="50" cy="42" rx="10" ry="12" fill={c.accent} />
      </svg>
    )
  }

  // Sapling stage - small tree with few leaves
  if (stage === 'sapling') {
    return (
      <svg
        className="absolute right-1 top-1 w-20 h-20 opacity-[0.22] pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
      >
        <path d="M50 90 L50 50" stroke={c.trunk} strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="38" r="18" fill={c.leaves} />
        <circle cx="42" cy="42" r="12" fill={c.accent} />
        <circle cx="58" cy="42" r="12" fill={c.accent} />
        <circle cx="50" cy="32" r="10" fill={c.accent} />
      </svg>
    )
  }

  // Young tree - medium sized
  if (stage === 'young') {
    return (
      <svg
        className="absolute right-0 top-0 w-22 h-22 opacity-[0.22] pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
      >
        <path d="M50 95 L50 50 Q48 46 44 44 M50 55 Q52 50 56 48" stroke={c.trunk} strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="35" r="20" fill={c.leaves} />
        <circle cx="38" cy="40" r="14" fill={c.accent} />
        <circle cx="62" cy="40" r="14" fill={c.accent} />
        <circle cx="50" cy="28" r="14" fill={c.leaves} />
        <circle cx="44" cy="32" r="9" fill={c.accent} />
        <circle cx="56" cy="32" r="9" fill={c.accent} />
      </svg>
    )
  }

  // Mature tree - full sized
  if (stage === 'mature') {
    return (
      <svg
        className="absolute right-0 top-0 w-24 h-24 opacity-[0.2] pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
      >
        <path d="M50 95 L50 55 Q48 50 45 48 M50 55 Q52 50 55 48" stroke={c.trunk} strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="35" r="22" fill={c.leaves} />
        <circle cx="38" cy="40" r="15" fill={c.accent} />
        <circle cx="62" cy="40" r="15" fill={c.accent} />
        <circle cx="50" cy="28" r="16" fill={c.leaves} />
        <circle cx="42" cy="32" r="12" fill={c.accent} />
        <circle cx="58" cy="32" r="12" fill={c.accent} />
        <circle cx="45" cy="25" r="5" fill={c.accent} opacity="0.7" />
        <circle cx="55" cy="38" r="4" fill={c.leaves} opacity="0.8" />
      </svg>
    )
  }

  // Ancient tree - largest with extra details
  return (
    <svg
      className="absolute right-0 top-0 w-28 h-28 opacity-[0.2] pointer-events-none"
      viewBox="0 0 100 100"
      fill="none"
    >
      <path d="M50 98 L50 52 Q46 46 40 44 M50 60 Q54 54 60 52 M50 68 Q48 64 44 62" stroke={c.trunk} strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="32" r="26" fill={c.leaves} />
      <circle cx="34" cy="38" r="18" fill={c.accent} />
      <circle cx="66" cy="38" r="18" fill={c.accent} />
      <circle cx="50" cy="22" r="20" fill={c.leaves} />
      <circle cx="38" cy="28" r="14" fill={c.accent} />
      <circle cx="62" cy="28" r="14" fill={c.accent} />
      <circle cx="50" cy="15" r="12" fill={c.accent} />
      <circle cx="42" cy="20" r="6" fill={c.leaves} opacity="0.8" />
      <circle cx="58" cy="35" r="5" fill={c.leaves} opacity="0.8" />
      <circle cx="30" cy="42" r="4" fill={c.accent} opacity="0.6" />
      <circle cx="70" cy="42" r="4" fill={c.accent} opacity="0.6" />
    </svg>
  )
}

export default function ConnectionCard({ connection, lastMemory, onLogInteraction, onPlanCatchup, onEdit, onViewDetails }: ConnectionCardProps) {
  const status = getConnectionStatusText(connection.last_interaction_date)
  const nextCatchup = getNextCatchupInfo(connection)
  const treeHealth = getTreeHealth(connection)
  const growthStage = getGrowthStage(connection)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100 relative overflow-hidden">
      <TreeBackground health={treeHealth} stage={growthStage} />
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

      <div className="flex gap-3">
        <button
          onClick={onLogInteraction}
          className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
        >
          Record catch-up
        </button>
        <button
          onClick={onPlanCatchup}
          className="py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
        >
          Plan catch-up
        </button>
      </div>
    </div>
  )
}
