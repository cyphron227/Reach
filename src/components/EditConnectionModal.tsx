'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CatchupFrequency, PreferredContactMethod } from '@/types/database'
import { parsePhone } from '@/lib/phone'

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

const contactMethodOptions: { value: PreferredContactMethod; label: string; icon: string }[] = [
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'text', label: 'Text', icon: '📱' },
  { value: 'email', label: 'Email', icon: '📧' },
]

export default function EditConnectionModal({ connection, isOpen, onClose, onSuccess }: EditConnectionModalProps) {
  const [name, setName] = useState(connection.name)
  const [phoneNumber, setPhoneNumber] = useState(connection.phone_raw || '')
  const [email, setEmail] = useState(connection.email || '')
  const [preferredMethod, setPreferredMethod] = useState<PreferredContactMethod | null>(
    connection.preferred_contact_method || null
  )
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
      setPreferredMethod(connection.preferred_contact_method || null)
      setFrequency(connection.catchup_frequency)
      setDeleteConfirm(false)
      setError(null)
    }
  }, [isOpen, connection])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 overscroll-contain"
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not on children
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto overscroll-contain"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-lavender-800">
              Edit connection
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-lavender-700 mb-1">
                Their name
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="edit-phone" className="block text-sm font-medium text-lavender-700 mb-1">
                Phone number <span className="text-lavender-400">(optional)</span>
              </label>
              <input
                id="edit-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                placeholder="e.g., +1 555 123 4567"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-lavender-700 mb-1">
                Email <span className="text-lavender-400">(optional)</span>
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                placeholder="e.g., sarah@example.com"
              />
            </div>

            {/* Preferred Contact Method */}
            <div>
              <label className="block text-sm font-medium text-lavender-700 mb-2">
                Preferred way to reach out <span className="text-lavender-400">(optional)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {contactMethodOptions.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPreferredMethod(
                      preferredMethod === method.value ? null : method.value
                    )}
                    className={`py-2 px-2 rounded-xl text-center transition-all ${
                      preferredMethod === method.value
                        ? 'bg-muted-teal-400 text-white'
                        : 'bg-lavender-50 text-lavender-600 hover:bg-lavender-100'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{method.icon}</div>
                    <div className="text-xs font-medium">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label htmlFor="edit-frequency" className="block text-sm font-medium text-lavender-700 mb-1">
                How often do you want to catch-up?
              </label>
              <select
                id="edit-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as CatchupFrequency)}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            <div className="pt-4 border-t border-lavender-100">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`w-full py-3 px-4 font-medium rounded-xl transition-colors disabled:opacity-50 ${
                  deleteConfirm
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-lavender-100 hover:bg-lavender-200 text-lavender-600'
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
