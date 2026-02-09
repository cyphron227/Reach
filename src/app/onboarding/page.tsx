'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingProgress from '@/components/OnboardingProgress'
import OnboardingStep, {
  OnboardingTitle,
  OnboardingText,
  OnboardingButton,
  OnboardingList,
} from '@/components/OnboardingStep'
import AddConnectionModal from '@/components/AddConnectionModal'
import PlanCatchupModal from '@/components/PlanCatchupModal'
import CatchupMethodModal from '@/components/CatchupMethodModal'
import { Connection } from '@/types/database'

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Step 4: DB connections + AddConnectionModal
  const [dbConnections, setDbConnections] = useState<Connection[]>([])
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false)

  // Step 5: Plan/Catchup modals
  const [selectedOnboardingConnection, setSelectedOnboardingConnection] = useState<Connection | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showCatchupModal, setShowCatchupModal] = useState(false)

  const fetchDbConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', user.id)
    setDbConnections((data as Connection[]) || [])
  }, [supabase])

  // Fetch connections when entering step 4 or 5
  useEffect(() => {
    if (step === 4 || step === 5) {
      fetchDbConnections()
    }
  }, [step, fetchDbConnections])

  const removeDbConnection = async (connectionId: string) => {
    await supabase.from('connections').delete().eq('id', connectionId)
    await fetchDbConnections()
  }

  const completeOnboarding = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: updateError } = await supabase
        .from('users')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating onboarding status:', updateError)
      }

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col pb-safe">
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
            {dbConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between bg-emerald-50 px-4 py-3 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600">&#10003;</span>
                  <span className="font-medium text-gray-900">{conn.name}</span>
                  {conn.phone_e164 && <span className="text-emerald-600">📱</span>}
                </div>
                <button
                  onClick={() => removeDbConnection(conn.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Add button */}
            {dbConnections.length < 3 && (
              <button
                onClick={() => setShowAddConnectionModal(true)}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 hover:border-emerald-500 text-gray-500 hover:text-emerald-600 font-medium rounded-xl transition-colors"
              >
                + Add a connection
              </button>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}

          <p className="text-sm text-gray-500 mb-6">
            You can add more later as you build the habit.
          </p>

          <div className="flex flex-col items-center gap-3">
            <OnboardingButton
              onClick={nextStep}
              disabled={dbConnections.length === 0}
            >
              Continue
            </OnboardingButton>
            <button
              onClick={nextStep}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip
            </button>
          </div>
        </OnboardingStep>
      )}

      {/* Step 5: First Action */}
      {step === 5 && (
        <OnboardingStep className="justify-start pt-8">
          <OnboardingTitle>Take your first action</OnboardingTitle>
          <OnboardingText className="mb-8">
            {dbConnections.length > 0
              ? 'Plan a catch-up or reach out now.'
              : 'You can always come back and add connections later.'}
          </OnboardingText>

          {dbConnections.length > 0 && (
            <div className="w-full max-w-sm space-y-3 mb-8">
              {dbConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <p className="font-medium text-gray-900 mb-3">{conn.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedOnboardingConnection(conn)
                        setShowPlanModal(true)
                      }}
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <span>📅</span> Plan
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOnboardingConnection(conn)
                        setShowCatchupModal(true)
                      }}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <span>💬</span> Catch-up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}

          <div className="flex flex-col items-center gap-3">
            <OnboardingButton
              onClick={completeOnboarding}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </OnboardingButton>
            <button
              onClick={completeOnboarding}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip for now
            </button>
          </div>
        </OnboardingStep>
      )}

      {/* Add Connection Modal */}
      <AddConnectionModal
        isOpen={showAddConnectionModal}
        onClose={() => setShowAddConnectionModal(false)}
        onSuccess={() => {
          setShowAddConnectionModal(false)
          fetchDbConnections()
        }}
      />

      {/* Plan Catchup Modal */}
      {selectedOnboardingConnection && (
        <PlanCatchupModal
          connection={selectedOnboardingConnection}
          isOpen={showPlanModal}
          onClose={() => {
            setShowPlanModal(false)
            setSelectedOnboardingConnection(null)
          }}
          onSuccess={() => {
            setShowPlanModal(false)
            setSelectedOnboardingConnection(null)
            fetchDbConnections()
          }}
        />
      )}

      {/* Catch-up Method Modal */}
      {selectedOnboardingConnection && (
        <CatchupMethodModal
          connection={selectedOnboardingConnection}
          isOpen={showCatchupModal}
          onClose={() => {
            setShowCatchupModal(false)
            setSelectedOnboardingConnection(null)
          }}
          onSuccess={() => {
            setShowCatchupModal(false)
            setSelectedOnboardingConnection(null)
          }}
        />
      )}
    </main>
  )
}
