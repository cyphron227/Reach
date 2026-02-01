'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CatchupFrequency, PreferredContactMethod } from '@/types/database'
import { isCapacitor, pickContact, SelectedContact } from '@/lib/capacitor'
import { parsePhone } from '@/lib/phone'
import ContactSelectionModal from './ContactSelectionModal'

interface AddConnectionModalProps {
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

export default function AddConnectionModal({ isOpen, onClose, onSuccess }: AddConnectionModalProps) {
  const [step, setStep] = useState<'source' | 'form'>('source')
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [preferredMethod, setPreferredMethod] = useState<PreferredContactMethod | null>(null)
  const [frequency, setFrequency] = useState<CatchupFrequency>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNative, setIsNative] = useState(false)

  // Contact selection modal state
  const [showContactSelection, setShowContactSelection] = useState(false)
  const [pendingContact, setPendingContact] = useState<SelectedContact | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setIsNative(isCapacitor())
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(isNative ? 'source' : 'form')
      setName('')
      setPhoneNumber('')
      setEmail('')
      setPreferredMethod(null)
      setFrequency('monthly')
      setError(null)
      setShowContactSelection(false)
      setPendingContact(null)
    }
  }, [isOpen, isNative])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleImportFromContacts = async () => {
    setError(null)

    try {
      // Try to pick contact directly - the plugin handles permissions internally
      const contact = await pickContact()

      if (!contact) {
        // User cancelled or no contact selected - this is fine, not an error
        return
      }

      // Check if we need to show selection modal
      const needsPhoneSelection = contact.phoneNumbers.length > 1
      const needsEmailSelection = contact.emails.length > 1

      if (needsPhoneSelection || needsEmailSelection) {
        setPendingContact(contact)
        setShowContactSelection(true)
      } else {
        // Pre-fill form directly
        setName(contact.name)
        setPhoneNumber(contact.phoneNumbers[0] || '')
        setEmail(contact.emails[0] || '')
        setStep('form')
      }
    } catch (err) {
      console.error('Contact picker error:', err)
      setError('Could not access contacts. You can enable permission in your device settings, or enter contact details manually.')
    }
  }

  const handleContactSelectionComplete = (phone: string | null, emailAddr: string | null) => {
    if (pendingContact) {
      setName(pendingContact.name)
      setPhoneNumber(phone || '')
      setEmail(emailAddr || '')
      setStep('form')
    }
    setShowContactSelection(false)
    setPendingContact(null)
  }

  const handleContactSelectionCancel = () => {
    setShowContactSelection(false)
    setPendingContact(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Parse and normalize phone number
      const phoneRaw = phoneNumber.trim() || null
      let phoneE164: string | null = null

      if (phoneRaw) {
        const parsed = parsePhone(phoneRaw)
        phoneE164 = parsed.e164
        // Note: We store both raw and e164 - e164 may be null if number is invalid
      }

      // Default last_interaction_date to today so the next catchup is calculated from now
      const today = new Date().toISOString().split('T')[0]

      const { error: insertError } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          name: name.trim(),
          catchup_frequency: frequency,
          last_interaction_date: today,
          phone_raw: phoneRaw,
          phone_e164: phoneE164,
          email: email.trim() || null,
          preferred_contact_method: preferredMethod,
        })

      if (insertError) throw insertError

      setName('')
      setPhoneNumber('')
      setEmail('')
      setPreferredMethod(null)
      setFrequency('monthly')
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
    <>
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
                New connection
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

            {/* Step 1: Source Selection (native only) */}
            {step === 'source' && isNative && (
              <div className="space-y-4">
                <button
                  onClick={handleImportFromContacts}
                  className="w-full py-4 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Import from contacts
                </button>

                <div className="text-center">
                  <button
                    onClick={() => setStep('form')}
                    className="text-sm text-lavender-600 hover:text-lavender-800 transition-colors underline"
                  >
                    Or enter details manually
                  </button>
                </div>

                {error && (
                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
                )}

                {/* Privacy notice */}
                <div className="pt-4 border-t border-lavender-100">
                  <ul className="space-y-2 text-xs text-lavender-500">
                    <li className="flex gap-2">
                      <span className="text-muted-teal-500">•</span>
                      <span>Ringur only accesses contacts you explicitly choose.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-muted-teal-500">•</span>
                      <span>We never scan, read, or upload your entire address book.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-muted-teal-500">•</span>
                      <span>Only the selected contact is saved to your Ringur account so it can sync across your devices.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-muted-teal-500">•</span>
                      <span>Contacts are private and never shared with third parties.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Form */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Back button (if came from source selection) */}
                {isNative && (
                  <button
                    type="button"
                    onClick={() => setStep('source')}
                    className="flex items-center gap-1 text-sm text-lavender-600 hover:text-lavender-800 transition-colors mb-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-lavender-700 mb-1">
                    Their name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                    placeholder="e.g., Sarah"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-lavender-700 mb-1">
                    Phone number <span className="text-lavender-400">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                    placeholder="e.g., +1 555 123 4567"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-lavender-700 mb-1">
                    Email <span className="text-lavender-400">(optional)</span>
                  </label>
                  <input
                    id="email"
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
                  <label htmlFor="frequency" className="block text-sm font-medium text-lavender-700 mb-1">
                    How often do you want to catch-up?
                  </label>
                  <select
                    id="frequency"
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

                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add connection'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Contact Selection Modal */}
      {pendingContact && (
        <ContactSelectionModal
          isOpen={showContactSelection}
          contactName={pendingContact.name}
          phoneNumbers={pendingContact.phoneNumbers}
          emails={pendingContact.emails}
          onSelect={handleContactSelectionComplete}
          onCancel={handleContactSelectionCancel}
        />
      )}
    </>
  )
}
