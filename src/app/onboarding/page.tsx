'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isCapacitor, pickContact, SelectedContact } from '@/lib/capacitor'
import { parsePhone } from '@/lib/phone'
import { initiateText } from '@/lib/intents'
import OnboardingProgress from '@/components/OnboardingProgress'
import OnboardingStep, {
  OnboardingTitle,
  OnboardingText,
  OnboardingButton,
  OnboardingList,
} from '@/components/OnboardingStep'
import ContactSelectionModal from '@/components/ContactSelectionModal'

const TOTAL_STEPS = 5

interface OnboardingConnection {
  name: string
  phoneRaw: string | null
  phoneE164: string | null
  email: string | null
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [connections, setConnections] = useState<OnboardingConnection[]>([])
  const [isNative, setIsNative] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Contact selection modal state
  const [showContactSelection, setShowContactSelection] = useState(false)
  const [pendingContact, setPendingContact] = useState<SelectedContact | null>(null)

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')

  // First action selection
  const [selectedAction, setSelectedAction] = useState<'text' | 'call' | 'reflect' | null>(null)

  useEffect(() => {
    setIsNative(isCapacitor())
  }, [])

  const handleImportFromContacts = async () => {
    setError(null)
    try {
      const contact = await pickContact()
      if (!contact) return

      const needsSelection = contact.phoneNumbers.length > 1 || contact.emails.length > 1
      if (needsSelection) {
        setPendingContact(contact)
        setShowContactSelection(true)
      } else {
        addConnection(contact.name, contact.phoneNumbers[0] || null, contact.emails[0] || null)
      }
    } catch (err) {
      console.error('Contact picker error:', err)
      setError('Could not access contacts. You can enter details manually.')
    }
  }

  const handleContactSelectionComplete = (phone: string | null, email: string | null) => {
    if (pendingContact) {
      addConnection(pendingContact.name, phone, email)
    }
    setShowContactSelection(false)
    setPendingContact(null)
  }

  const addConnection = (name: string, phoneRaw: string | null, email: string | null) => {
    if (connections.length >= 3) return

    let phoneE164: string | null = null
    if (phoneRaw) {
      const parsed = parsePhone(phoneRaw)
      phoneE164 = parsed.e164
    }

    setConnections([...connections, { name, phoneRaw, phoneE164, email }])
    setShowManualEntry(false)
    setManualName('')
    setManualPhone('')
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualName.trim()) {
      addConnection(manualName.trim(), manualPhone.trim() || null, null)
    }
  }

  const removeConnection = (index: number) => {
    setConnections(connections.filter((_, i) => i !== index))
  }

  const saveConnectionsAndComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = new Date().toISOString().split('T')[0]

      // Save all connections
      for (const conn of connections) {
        const { error: insertError } = await supabase
          .from('connections')
          .insert({
            user_id: user.id,
            name: conn.name,
            catchup_frequency: 'weekly',
            last_interaction_date: today,
            phone_raw: conn.phoneRaw,
            phone_e164: conn.phoneE164,
            email: conn.email,
          })

        if (insertError) {
          console.error('Error inserting connection:', insertError)
        }
      }

      // Handle selected action
      if (selectedAction && connections.length > 0) {
        const firstConn = connections[0]

        if (selectedAction === 'text' && firstConn.phoneE164) {
          // Open SMS
          initiateText(firstConn.phoneE164)
        } else if (selectedAction === 'call' && firstConn.phoneE164) {
          // Create a pending call intent
          const { data: savedConn } = await supabase
            .from('connections')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', firstConn.name)
            .single()

          if (savedConn) {
            await supabase.from('communication_intents').insert({
              user_id: user.id,
              connection_id: savedConn.id,
              method: 'call',
            })
          }
        } else if (selectedAction === 'reflect') {
          // Log a self-reflection action (if habit engine tables exist)
          // For now, this is a no-op since we might not have the tables yet
        }
      }

      // Mark onboarding complete
      const { error: updateError } = await supabase
        .from('users')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating onboarding status:', updateError)
      }

      // Redirect to home
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const handleSkip = () => {
    setSelectedAction(null)
    saveConnectionsAndComplete()
  }

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
    }
  }

  const firstConnectionWithPhone = connections.find(c => c.phoneE164)

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Progress indicator */}
      <div className="pt-8 pb-4">
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <OnboardingStep>
          <div className="text-6xl mb-6">🌱</div>
          <OnboardingTitle>Welcome to Ringur</OnboardingTitle>
          <OnboardingText>
            Relationships fade when we stop investing.
            Life gets busy. Habits slip. Connection thins.
          </OnboardingText>
          <div className="mt-2">
            <OnboardingText>
              This app helps you stay consistent.
            </OnboardingText>
          </div>
          <div className="mt-10">
            <OnboardingButton onClick={nextStep}>Continue</OnboardingButton>
          </div>
        </OnboardingStep>
      )}

      {/* Step 2: Philosophy */}
      {step === 2 && (
        <OnboardingStep>
          <OnboardingTitle>This is a practice, not an app</OnboardingTitle>
          <OnboardingText className="mb-6">
            Every day, take one small action:
          </OnboardingText>
          <OnboardingList
            items={[
              { text: 'A text to check in' },
              { text: 'A call to catch up' },
              { text: 'A plan to meet up' },
            ]}
            className="mb-6"
          />
          <OnboardingText>
            Small, consistent investment. That&apos;s it.
          </OnboardingText>
          <div className="mt-10">
            <OnboardingButton onClick={nextStep}>Continue</OnboardingButton>
          </div>
        </OnboardingStep>
      )}

      {/* Step 3: Expectations */}
      {step === 3 && (
        <OnboardingStep>
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">What Ringur is:</h2>
              <OnboardingList
                items={[
                  { text: 'A daily connection habit', positive: true },
                  { text: 'Gentle nudges when you drift', positive: true },
                  { text: 'A way to track who matters', positive: true },
                ]}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-500 mb-3">What it isn&apos;t:</h2>
              <OnboardingList
                items={[
                  { text: 'Social media', positive: false },
                  { text: 'A messaging app', positive: false },
                  { text: 'Contact management', positive: false },
                ]}
              />
            </div>
          </div>
          <div className="mt-10">
            <OnboardingButton onClick={nextStep}>Got it</OnboardingButton>
          </div>
        </OnboardingStep>
      )}

      {/* Step 4: Add Connections */}
      {step === 4 && (
        <OnboardingStep className="justify-start pt-8">
          <OnboardingTitle>Start with 1-3 people</OnboardingTitle>
          <OnboardingText className="mb-8">
            Who do you want to stay close to?
            Not everyone. Just the ones that matter most.
          </OnboardingText>

          {/* Added connections */}
          <div className="w-full max-w-sm space-y-3 mb-6">
            {connections.map((conn, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-emerald-50 px-4 py-3 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600">&#10003;</span>
                  <span className="font-medium text-gray-900">{conn.name}</span>
                  {conn.phoneE164 && <span className="text-emerald-600">📱</span>}
                </div>
                <button
                  onClick={() => removeConnection(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Add more slots */}
            {connections.length < 3 && !showManualEntry && (
              <div className="space-y-3">
                {isNative ? (
                  <>
                    <button
                      onClick={handleImportFromContacts}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <span>+</span> Add from contacts
                    </button>
                    <button
                      onClick={() => setShowManualEntry(true)}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      Or enter manually
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="w-full py-3 px-4 border-2 border-dashed border-gray-300 hover:border-emerald-500 text-gray-500 hover:text-emerald-600 font-medium rounded-xl transition-colors"
                  >
                    + Add a connection
                  </button>
                )}
              </div>
            )}

            {/* Manual entry form */}
            {showManualEntry && (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Their name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Phone number (recommended)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualEntry(false)
                      setManualName('')
                      setManualPhone('')
                    }}
                    className="flex-1 py-2 px-4 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!manualName.trim()}
                    className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}

          <p className="text-sm text-gray-500 mb-6">
            You can add more later as you build the habit.
          </p>

          <OnboardingButton
            onClick={nextStep}
            disabled={connections.length === 0}
          >
            Continue
          </OnboardingButton>
        </OnboardingStep>
      )}

      {/* Step 5: First Action */}
      {step === 5 && (
        <OnboardingStep className="justify-start pt-8">
          <OnboardingTitle>Take your first action</OnboardingTitle>
          {connections.length > 0 && (
            <p className="text-emerald-600 font-medium mb-6">
              {connections[0].name} - added to your circle
            </p>
          )}
          <OnboardingText className="mb-8">
            What will you do today?
          </OnboardingText>

          <div className="w-full max-w-sm space-y-3 mb-8">
            {/* Text option - only if phone exists */}
            {firstConnectionWithPhone ? (
              <button
                onClick={() => setSelectedAction('text')}
                className={`w-full py-4 px-4 rounded-xl border-2 transition-all text-left ${
                  selectedAction === 'text'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💬</span>
                  <span className="font-medium">Send them a quick text</span>
                </div>
              </button>
            ) : (
              <div className="py-4 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-left opacity-60">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💬</span>
                  <span className="text-gray-500">Add a phone number to text them</span>
                </div>
              </div>
            )}

            {/* Call/plan option */}
            <button
              onClick={() => setSelectedAction('call')}
              className={`w-full py-4 px-4 rounded-xl border-2 transition-all text-left ${
                selectedAction === 'call'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📞</span>
                <span className="font-medium">Plan to call them this week</span>
              </div>
            </button>

            {/* Reflect option */}
            <button
              onClick={() => setSelectedAction('reflect')}
              className={`w-full py-4 px-4 rounded-xl border-2 transition-all text-left ${
                selectedAction === 'reflect'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🤔</span>
                <span className="font-medium">Just reflect on this relationship</span>
              </div>
            </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            <OnboardingButton
              onClick={saveConnectionsAndComplete}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </OnboardingButton>
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip for now
            </button>
          </div>
        </OnboardingStep>
      )}

      {/* Contact Selection Modal */}
      {pendingContact && (
        <ContactSelectionModal
          isOpen={showContactSelection}
          contactName={pendingContact.name}
          phoneNumbers={pendingContact.phoneNumbers}
          emails={pendingContact.emails}
          onSelect={handleContactSelectionComplete}
          onCancel={() => {
            setShowContactSelection(false)
            setPendingContact(null)
          }}
        />
      )}
    </main>
  )
}
