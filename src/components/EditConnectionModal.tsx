'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CatchupFrequency, PreferredContactMethod } from '@/types/database'
import { parsePhone } from '@/lib/phone'
import { useScrollLock } from '@/lib/useScrollLock'

// Simple email validation
function isValidEmail(email: string): boolean {
  if (!email) return true // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

interface EditConnectionModalProps {
  connection: Connection
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const frequencyOptions: { value: CatchupFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'biannually', label: 'Every 6 months' },
  { value: 'annually', label: 'Annually' },
]

export default function EditConnectionModal({ connection, isOpen, onClose, onSuccess }: EditConnectionModalProps) {
  const [name, setName] = useState(connection.name)
  const [phoneNumber, setPhoneNumber] = useState(connection.phone_raw || '')
  const [email, setEmail] = useState(connection.email || '')
  const [preferredMethod, setPreferredMethod] = useState<PreferredContactMethod | null>(connection.preferred_contact_method)
  const [frequency, setFrequency] = useState<CatchupFrequency>(connection.catchup_frequency)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      setName(connection.name)
      setPhoneNumber(connection.phone_raw || '')
      setEmail(connection.email || '')
      setPreferredMethod(connection.preferred_contact_method)
      setFrequency(connection.catchup_frequency)
      setDeleteConfirm(false)
      setError(null)
    }
  }, [isOpen, connection])

  // Lock body scroll when modal is open
  useScrollLock(isOpen)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate email format if provided
    const emailTrimmed = email.trim()
    if (emailTrimmed && !isValidEmail(emailTrimmed)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      // Parse and normalize phone number
      const phoneRaw = phoneNumber.trim() || null
      let phoneE164: string | null = null

      if (phoneRaw) {
        const parsed = parsePhone(phoneRaw)
        phoneE164 = parsed.e164
      }

      const { error: updateError } = await supabase
        .from('connections')
        .update({
          name: name.trim(),
          catchup_frequency: frequency,
          phone_raw: phoneRaw,
          phone_e164: phoneE164,
          email: email.trim() || null,
          preferred_contact_method: preferredMethod,
        })
        .eq('id', connection.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('connections')
        .delete()
        .eq('id', connection.id)

      if (deleteError) throw deleteError

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
      className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pt-4 pb-safe overscroll-contain"
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not on children
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
              Edit connection
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="edit-name" className="block text-micro-medium text-text-tertiary mb-1">
                Their name
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-bone-warm border-none rounded-md px-4 py-3 text-body text-obsidian placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="edit-phone" className="block text-micro-medium text-text-tertiary mb-1">
                Phone number <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                id="edit-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-bone-warm border-none rounded-md px-4 py-3 text-body text-obsidian placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
                placeholder="e.g., +1 555 123 4567"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="edit-email" className="block text-micro-medium text-text-tertiary mb-1">
                Email <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bone-warm border-none rounded-md px-4 py-3 text-body text-obsidian placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
                placeholder="e.g., sarah@example.com"
              />
            </div>

            {/* Preferred Messaging App */}
            <div>
              <label className="block text-micro-medium text-text-tertiary mb-1">
                Preferred messaging app <span className="text-text-tertiary">(optional)</span>
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'text' as PreferredContactMethod, label: 'Text' },
                  { value: 'whatsapp' as PreferredContactMethod, label: 'WhatsApp' },
                  { value: 'email' as PreferredContactMethod, label: 'Email' },
                ]).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPreferredMethod(preferredMethod === option.value ? null : option.value)}
                    className={`flex-1 py-2.5 px-2 rounded-md text-center transition-all duration-calm ${
                      preferredMethod === option.value
                        ? 'bg-moss text-bone shadow-card'
                        : 'bg-bone-warm text-obsidian hover:shadow-card'
                    }`}
                  >
                    <div className="text-body font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label htmlFor="edit-frequency" className="block text-micro-medium text-text-tertiary mb-1">
                How often do you want to catch-up?
              </label>
              <select
                id="edit-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as CatchupFrequency)}
                className="w-full bg-bone-warm border-none rounded-md px-4 py-3 text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-ember text-body bg-bone-warm p-3 rounded-md">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            <div className="pt-4 border-t border-bone-warm">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`w-full py-3 px-4 font-medium rounded-md transition-all duration-calm disabled:opacity-40 ${
                  deleteConfirm
                    ? 'bg-ember hover:bg-ember/90 text-bone'
                    : 'bg-bone-warm hover:shadow-card text-obsidian'
                }`}
              >
                {deleteConfirm ? 'Click again to confirm delete' : 'Delete connection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
