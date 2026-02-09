'use client'

import { useState } from 'react'
import { formatPhoneNumber } from '@/lib/capacitor'
import { useScrollLock } from '@/lib/useScrollLock'

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
  useScrollLock(isOpen)

  const handleContinue = () => {
    onSelect(
      selectedPhone || (phoneNumbers.length === 1 ? phoneNumbers[0] : null),
      selectedEmail || (emails.length === 1 ? emails[0] : null)
    )
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] px-4 pt-4 pb-safe overscroll-contain"
      onClick={onCancel}
    >
      <div
        className="bg-bone rounded-lg w-full max-w-md shadow-modal max-h-[80vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h2 font-medium text-obsidian">
              Select contact info
            </h2>
            <button
              onClick={onCancel}
              className="text-ash hover:text-obsidian transition-all duration-calm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-body text-obsidian mb-6">
            {contactName} has multiple contact options. Choose which ones to use.
          </p>

          <div className="space-y-6">
            {/* Phone Number Selection */}
            {showPhoneSelection && (
              <div>
                <label className="block text-body font-medium text-obsidian mb-3">
                  Phone number
                </label>
                <div className="space-y-2">
                  {phoneNumbers.map((phone, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-md cursor-pointer transition-all duration-calm shadow-card ${
                        selectedPhone === phone
                          ? 'bg-moss/10 ring-1 ring-moss/30'
                          : 'bg-bone-warm hover:bg-moss/5'
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
                        className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all duration-calm ${
                          selectedPhone === phone
                            ? 'border-moss bg-moss'
                            : 'border-ash'
                        }`}
                      >
                        {selectedPhone === phone && (
                          <span className="w-2 h-2 rounded-full bg-bone" />
                        )}
                      </span>
                      <span className="text-obsidian">{formatPhoneNumber(phone)}</span>
                    </label>
                  ))}
                  <label
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-all duration-calm shadow-card ${
                      selectedPhone === ''
                        ? 'bg-moss/10 ring-1 ring-moss/30'
                        : 'bg-bone-warm hover:bg-moss/5'
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
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all duration-calm ${
                        selectedPhone === ''
                          ? 'border-moss bg-moss'
                          : 'border-ash'
                      }`}
                    >
                      {selectedPhone === '' && (
                        <span className="w-2 h-2 rounded-full bg-bone" />
                      )}
                    </span>
                    <span className="text-ash italic">Skip - don&apos;t save phone number</span>
                  </label>
                </div>
              </div>
            )}

            {/* Email Selection */}
            {showEmailSelection && (
              <div>
                <label className="block text-body font-medium text-obsidian mb-3">
                  Email address
                </label>
                <div className="space-y-2">
                  {emails.map((email, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-md cursor-pointer transition-all duration-calm shadow-card ${
                        selectedEmail === email
                          ? 'bg-moss/10 ring-1 ring-moss/30'
                          : 'bg-bone-warm hover:bg-moss/5'
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
                        className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all duration-calm ${
                          selectedEmail === email
                            ? 'border-moss bg-moss'
                            : 'border-ash'
                        }`}
                      >
                        {selectedEmail === email && (
                          <span className="w-2 h-2 rounded-full bg-bone" />
                        )}
                      </span>
                      <span className="text-obsidian break-all">{email}</span>
                    </label>
                  ))}
                  <label
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-all duration-calm shadow-card ${
                      selectedEmail === ''
                        ? 'bg-moss/10 ring-1 ring-moss/30'
                        : 'bg-bone-warm hover:bg-moss/5'
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
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all duration-calm ${
                        selectedEmail === ''
                          ? 'border-moss bg-moss'
                          : 'border-ash'
                      }`}
                    >
                      {selectedEmail === '' && (
                        <span className="w-2 h-2 rounded-full bg-bone" />
                      )}
                    </span>
                    <span className="text-ash italic">Skip - don&apos;t save email</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-bone-warm text-obsidian font-medium rounded-md hover:bg-ash/10 transition-all duration-calm"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 py-3 px-4 bg-moss hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
