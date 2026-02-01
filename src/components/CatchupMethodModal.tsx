'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CommunicationMethod } from '@/types/database'
import { initiateCall, initiateWhatsApp, initiateText, initiateEmail } from '@/lib/capacitor'

interface CatchupMethodModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const methodOptions: {
  value: CommunicationMethod
  label: string
  icon: string
  requiresPhone: boolean
  requiresE164: boolean  // WhatsApp requires normalized E.164 number
  requiresEmail: boolean
}[] = [
  { value: 'call', label: 'Call', icon: '📞', requiresPhone: true, requiresE164: false, requiresEmail: false },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', requiresPhone: true, requiresE164: true, requiresEmail: false },
  { value: 'text', label: 'Text', icon: '📱', requiresPhone: true, requiresE164: false, requiresEmail: false },
  { value: 'email', label: 'Email', icon: '📧', requiresPhone: false, requiresE164: false, requiresEmail: true },
]

export default function CatchupMethodModal({
  connection,
  isOpen,
  onClose,
  onSuccess
}: CatchupMethodModalProps) {
  const [loading, setLoading] = useState<CommunicationMethod | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // phone_raw = original number for display/call/text
  // phone_e164 = normalized number for WhatsApp deep linking
  const hasPhone = !!connection.phone_raw
  const hasE164 = !!connection.phone_e164
  const hasEmail = !!connection.email

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

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
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 overscroll-contain"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-lavender-800">
              Catch up with {connection.name}
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

          <p className="text-sm text-lavender-600 mb-6">
            Choose how you&apos;d like to reach out
          </p>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {methodOptions.map((method) => {
              const disabled = isMethodDisabled(method)
              const disabledReason = getDisabledReason(method)
              const isLoading = loading === method.value

              return (
                <button
                  key={method.value}
                  onClick={() => handleMethodSelect(method.value)}
                  disabled={disabled || loading !== null}
                  className={`py-4 px-4 rounded-xl text-center transition-all ${
                    disabled
                      ? 'bg-lavender-50 text-lavender-300 cursor-not-allowed'
                      : loading !== null
                        ? 'bg-lavender-100 text-lavender-500 cursor-wait'
                        : 'bg-lavender-100 text-lavender-700 hover:bg-muted-teal-100 hover:text-muted-teal-700'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {isLoading ? (
                      <span className="inline-block animate-spin">⏳</span>
                    ) : (
                      method.icon
                    )}
                  </div>
                  <div className="text-sm font-medium">{method.label}</div>
                  {disabled && disabledReason && (
                    <div className="text-xs text-lavender-400 mt-1">{disabledReason}</div>
                  )}
                </button>
              )
            })}
          </div>

          <p className="text-xs text-lavender-400 text-center mt-6">
            Opens your default app for the selected method
          </p>
        </div>
      </div>
    </div>
  )
}
