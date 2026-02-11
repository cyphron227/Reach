'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CommunicationMethod, Interaction, InteractionType } from '@/types/database'
import { initiateCall, initiateWhatsApp, initiateText, initiateEmail } from '@/lib/capacitor'
import { useScrollLock } from '@/lib/useScrollLock'

interface CatchupMethodModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const methodOptions: {
  value: CommunicationMethod
  label: string
  requiresPhone: boolean
  requiresE164: boolean  // WhatsApp requires normalized E.164 number
  requiresEmail: boolean
}[] = [
  { value: 'call', label: 'Call', requiresPhone: true, requiresE164: false, requiresEmail: false },
  { value: 'whatsapp', label: 'WhatsApp', requiresPhone: true, requiresE164: true, requiresEmail: false },
  { value: 'text', label: 'Text', requiresPhone: true, requiresE164: false, requiresEmail: false },
  { value: 'email', label: 'Email', requiresPhone: false, requiresE164: false, requiresEmail: true },
]

const interactionTypeLabels: Record<InteractionType, string> = {
  call: 'call',
  text: 'text',
  in_person: 'in-person meeting',
  other: 'catch-up',
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return 'last week'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return 'last month'
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function CatchupMethodModal({
  connection,
  isOpen,
  onClose,
  onSuccess
}: CatchupMethodModalProps) {
  const [loading, setLoading] = useState<CommunicationMethod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastInteraction, setLastInteraction] = useState<Interaction | null>(null)

  const supabase = createClient()

  // phone_raw = original number for display/call/text
  // phone_e164 = normalized number for WhatsApp deep linking
  const hasPhone = !!connection.phone_raw
  const hasE164 = !!connection.phone_e164
  const hasEmail = !!connection.email

  // Lock body scroll when modal is open
  useScrollLock(isOpen)

  useEffect(() => {
    if (isOpen) {
      fetchLastInteraction()
    }
  }, [isOpen, connection.id])

  const fetchLastInteraction = async () => {
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('connection_id', connection.id)
      .order('interaction_date', { ascending: false })
      .limit(1)
      .single()

    setLastInteraction(data)
  }

  const handleMethodSelect = async (method: CommunicationMethod) => {
    setLoading(method)
    setError(null)

    try {
      // Track the intent in Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase
        .from('communication_intents')
        .insert({
          user_id: user.id,
          connection_id: connection.id,
          method: method,
        })

      if (insertError) {
        console.error('Failed to track intent:', insertError)
        // Continue anyway - don't block the user from contacting
      }

      // Initiate the communication
      // Use phone_e164 for WhatsApp, phone_raw for call/text
      switch (method) {
        case 'call':
          await initiateCall(connection.phone_raw!)
          break
        case 'whatsapp':
          // WhatsApp requires E.164 normalized number
          await initiateWhatsApp(connection.phone_e164!)
          break
        case 'text':
          await initiateText(connection.phone_raw!)
          break
        case 'email':
          await initiateEmail(connection.email!)
          break
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to initiate communication:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  const isMethodDisabled = (method: typeof methodOptions[number]) => {
    if (method.requiresPhone && !hasPhone) return true
    // WhatsApp requires a valid E.164 number
    if (method.requiresE164 && !hasE164) return true
    if (method.requiresEmail && !hasEmail) return true
    return false
  }

  const getDisabledReason = (method: typeof methodOptions[number]) => {
    if (method.requiresPhone && !hasPhone) return 'No phone number'
    // WhatsApp needs E.164 - show specific message if phone exists but isn't valid
    if (method.requiresE164 && !hasE164) {
      return hasPhone ? 'Invalid phone format' : 'No phone number'
    }
    if (method.requiresEmail && !hasEmail) return 'No email address'
    return null
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
        className="bg-white rounded-lg w-full max-w-md shadow-modal max-h-[90vh] overflow-y-auto overscroll-contain"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h2 font-medium text-obsidian">
              Catch up with {connection.name}
            </h2>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-obsidian transition-all duration-calm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-body text-obsidian mb-4">
            Choose how you&apos;d like to reach out
          </p>

          {/* Last Interaction Note */}
          {lastInteraction?.memory && (
            <div className="mb-4 p-4 bg-bone-warm rounded-md shadow-card">
              <div className="text-label font-medium text-text-tertiary mb-2">
                From your last {interactionTypeLabels[lastInteraction.interaction_type]} {formatRelativeDate(lastInteraction.interaction_date)}
              </div>
              <p className="text-body text-obsidian italic">
                &ldquo;{lastInteraction.memory}&rdquo;
              </p>
            </div>
          )}

          {error && (
            <p className="text-bone text-body bg-ember p-3 rounded-md mb-4">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {methodOptions.map((method) => {
              const disabled = isMethodDisabled(method)
              const disabledReason = getDisabledReason(method)
              const isLoading = loading === method.value

              const isPreferred = connection.preferred_contact_method === method.value

              return (
                <button
                  key={method.value}
                  onClick={() => handleMethodSelect(method.value)}
                  disabled={disabled || loading !== null}
                  className={`py-4 px-4 rounded-md text-center transition-all duration-calm ${
                    disabled
                      ? 'bg-bone-warm text-text-secondary opacity-40 cursor-not-allowed'
                      : loading !== null
                        ? 'bg-bone-warm text-text-secondary cursor-wait'
                        : isPreferred
                          ? 'bg-moss/10 text-moss ring-1 ring-moss/40'
                          : 'bg-bone-warm text-obsidian hover:bg-moss/10 hover:text-moss'
                  }`}
                >
                  <div className="text-body font-medium">{method.label}</div>
                  {isLoading && (
                    <div className="text-micro text-text-tertiary mt-1 animate-gentle-pulse">Loading</div>
                  )}
                  {disabled && disabledReason && (
                    <div className="text-micro text-text-tertiary mt-1">{disabledReason}</div>
                  )}
                </button>
              )
            })}
          </div>

          <p className="text-micro text-text-tertiary text-center mt-6">
            Opens your default app for the selected method
          </p>
        </div>
      </div>
    </div>
  )
}
