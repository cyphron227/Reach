'use client'

import { useState, useEffect } from 'react'
import { formatPhoneNumber } from '@/lib/capacitor'

interface ContactSelectionModalProps {
  isOpen: boolean
  contactName: string
  phoneNumbers: string[]
  emails: string[]
  onSelect: (phone: string | null, email: string | null) => void
  onCancel: () => void
}

export default function ContactSelectionModal({
  isOpen,
  contactName,
  phoneNumbers,
  emails,
  onSelect,
  onCancel,
}: ContactSelectionModalProps) {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    phoneNumbers.length === 1 ? phoneNumbers[0] : null
  )
  const [selectedEmail, setSelectedEmail] = useState<string | null>(
    emails.length === 1 ? emails[0] : null
  )

  const showPhoneSelection = phoneNumbers.length > 1
  const showEmailSelection = emails.length > 1

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleContinue = () => {
    onSelect(
      selectedPhone || (phoneNumbers.length === 1 ? phoneNumbers[0] : null),
      selectedEmail || (emails.length === 1 ? emails[0] : null)
    )
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4 overscroll-contain"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-lavender-800">
              Select contact info
            </h2>
            <button
              onClick={onCancel}
              className="text-lavender-400 hover:text-lavender-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-lavender-600 mb-6">
            {contactName} has multiple contact options. Choose which ones to use.
          </p>

          <div className="space-y-6">
            {/* Phone Number Selection */}
            {showPhoneSelection && (
              <div>
                <label className="block text-sm font-medium text-lavender-700 mb-3">
                  Phone number
                </label>
                <div className="space-y-2">
                  {phoneNumbers.map((phone, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPhone === phone
                          ? 'border-muted-teal-400 bg-muted-teal-50'
                          : 'border-lavender-200 hover:border-lavender-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="phone"
                        value={phone}
                        checked={selectedPhone === phone}
                        onChange={() => setSelectedPhone(phone)}
                        className="sr-only"
                      />
                      <span
                        className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          selectedPhone === phone
                            ? 'border-muted-teal-500 bg-muted-teal-500'
                            : 'border-lavender-300'
                        }`}
                      >
                        {selectedPhone === phone && (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="text-lavender-800">{formatPhoneNumber(phone)}</span>
                    </label>
                  ))}
                  <label
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedPhone === ''
                        ? 'border-muted-teal-400 bg-muted-teal-50'
                        : 'border-lavender-200 hover:border-lavender-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="phone"
                      value=""
                      checked={selectedPhone === ''}
                      onChange={() => setSelectedPhone('')}
                      className="sr-only"
                    />
                    <span
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        selectedPhone === ''
                          ? 'border-muted-teal-500 bg-muted-teal-500'
                          : 'border-lavender-300'
                      }`}
                    >
                      {selectedPhone === '' && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-lavender-500 italic">Skip - don&apos;t save phone number</span>
                  </label>
                </div>
              </div>
            )}

            {/* Email Selection */}
            {showEmailSelection && (
              <div>
                <label className="block text-sm font-medium text-lavender-700 mb-3">
                  Email address
                </label>
                <div className="space-y-2">
                  {emails.map((email, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedEmail === email
                          ? 'border-muted-teal-400 bg-muted-teal-50'
                          : 'border-lavender-200 hover:border-lavender-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="email"
                        value={email}
                        checked={selectedEmail === email}
                        onChange={() => setSelectedEmail(email)}
                        className="sr-only"
                      />
                      <span
                        className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          selectedEmail === email
                            ? 'border-muted-teal-500 bg-muted-teal-500'
                            : 'border-lavender-300'
                        }`}
                      >
                        {selectedEmail === email && (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="text-lavender-800 break-all">{email}</span>
                    </label>
                  ))}
                  <label
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedEmail === ''
                        ? 'border-muted-teal-400 bg-muted-teal-50'
                        : 'border-lavender-200 hover:border-lavender-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="email"
                      value=""
                      checked={selectedEmail === ''}
                      onChange={() => setSelectedEmail('')}
                      className="sr-only"
                    />
                    <span
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        selectedEmail === ''
                          ? 'border-muted-teal-500 bg-muted-teal-500'
                          : 'border-lavender-300'
                      }`}
                    >
                      {selectedEmail === '' && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-lavender-500 italic">Skip - don&apos;t save email</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-lavender-200 text-lavender-600 font-medium rounded-xl hover:bg-lavender-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
