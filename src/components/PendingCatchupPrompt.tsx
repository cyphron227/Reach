'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PendingIntent, getMethodLabel, dismissPendingIntent } from '@/lib/pendingIntents'

interface PendingCatchupPromptProps {
  pendingIntent: PendingIntent
  onRecordCatchup: () => void
  onDismiss: () => void
}

export default function PendingCatchupPrompt({
  pendingIntent,
  onRecordCatchup,
  onDismiss,
}: PendingCatchupPromptProps) {
  const [dismissing, setDismissing] = useState(false)
  const supabase = createClient()

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await dismissPendingIntent(supabase, pendingIntent.intent.id)
      onDismiss()
    } catch (error) {
      console.error('Failed to dismiss intent:', error)
    } finally {
      setDismissing(false)
    }
  }

  const methodLabel = getMethodLabel(pendingIntent.intent.method)
  const timeAgo = getTimeAgo(pendingIntent.intent.initiated_at)

  return (
    <div className="bg-gradient-to-r from-muted-teal-50 to-lavender-50 rounded-2xl p-4 shadow-sm border border-muted-teal-100 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">
          {pendingIntent.intent.method === 'call' && '📞'}
          {pendingIntent.intent.method === 'text' && '📱'}
          {pendingIntent.intent.method === 'whatsapp' && '💬'}
          {pendingIntent.intent.method === 'email' && '📧'}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-lavender-800">
            Did you catch up with {pendingIntent.connection.name}?
          </div>
          <div className="text-xs text-lavender-500 mt-0.5">
            You {methodLabel} them {timeAgo}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onRecordCatchup}
          className="flex-1 py-2.5 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Record catch-up
        </button>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="py-2.5 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {dismissing ? '...' : 'Skip'}
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
