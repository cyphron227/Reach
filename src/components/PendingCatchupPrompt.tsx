'use client'

import { PendingIntent, getMethodLabel, dismissPendingIntent } from '@/lib/pendingIntents'

interface PendingCatchupPromptProps {
  pendingIntent: PendingIntent
  onRecordCatchup: () => void
  onDismiss: () => void
}

const METHOD_LABELS: Record<string, string> = {
  call: 'Call',
  text: 'Text',
  whatsapp: 'WhatsApp',
  email: 'Email',
}

export default function PendingCatchupPrompt({
  pendingIntent,
  onRecordCatchup,
  onDismiss,
}: PendingCatchupPromptProps) {
  const handleDismiss = () => {
    dismissPendingIntent(pendingIntent.intent.id)
    onDismiss()
  }

  const methodLabel = getMethodLabel(pendingIntent.intent.method)
  const timeAgo = getTimeAgo(pendingIntent.intent.initiated_at)
  const displayLabel = METHOD_LABELS[pendingIntent.intent.method] || methodLabel

  return (
    <div className="bg-bone shadow-card rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-body font-medium text-moss">
          {displayLabel}
        </div>
        <div className="flex-1">
          <div className="text-body font-medium text-obsidian">
            Did you catch up with {pendingIntent.connection.name}?
          </div>
          <div className="text-micro text-ash mt-0.5">
            You {methodLabel} them {timeAgo}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onRecordCatchup}
          className="flex-1 py-2.5 px-4 bg-moss hover:opacity-90 text-bone text-body font-medium rounded-md transition-all duration-calm"
        >
          Record catch-up
        </button>
        <button
          onClick={handleDismiss}
          className="py-2.5 px-4 bg-bone-warm hover:bg-ash/10 text-obsidian text-body font-medium rounded-md transition-all duration-calm"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'just now'
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'yesterday'
  return `${diffDays} days ago`
}
