'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ReflectionStep = 'connected' | 'grow_closer' | 'complete'

export default function ReflectPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<ReflectionStep>('connected')
  const [mostConnected, setMostConnected] = useState<string | null>(null)
  const [growCloser, setGrowCloser] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const fetchConnections = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', authUser.id)
      .order('name', { ascending: true })

    setConnections(data || [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleNext = () => {
    if (step === 'connected') {
      setStep('grow_closer')
    } else if (step === 'grow_closer') {
      setStep('complete')
    }
  }

  const handleSkip = () => {
    if (step === 'connected') {
      setStep('grow_closer')
    } else if (step === 'grow_closer') {
      setStep('complete')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-lavender-50">
      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="text-muted-teal-500 font-semibold text-lg">Weekly Reflection</div>
          <div className="w-12" />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'connected' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'grow_closer' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'complete' ? 'bg-muted-teal-400' : 'bg-lavender-200'
          }`} />
        </div>

        {/* Step 1: Most Connected */}
        {step === 'connected' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">💭</div>
              <h2 className="text-xl font-semibold text-lavender-800 mb-2">
                Who did you feel most connected to this week?
              </h2>
              <p className="text-sm text-lavender-500">
                Think about conversations that felt meaningful
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => setMostConnected(connection.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    mostConnected === connection.id
                      ? 'bg-muted-teal-100 border-2 border-muted-teal-400'
                      : 'bg-lavender-50 border-2 border-transparent hover:bg-lavender-100'
                  }`}
                >
                  <div className="font-medium text-lavender-800">{connection.name}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!mostConnected}
                className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Grow Closer */}
        {step === 'grow_closer' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">🌱</div>
              <h2 className="text-xl font-semibold text-lavender-800 mb-2">
                Is there anyone you&apos;d like to grow closer to?
              </h2>
              <p className="text-sm text-lavender-500">
                Someone you&apos;ve been meaning to reach out to
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => setGrowCloser(connection.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    growCloser === connection.id
                      ? 'bg-muted-teal-100 border-2 border-muted-teal-400'
                      : 'bg-lavender-50 border-2 border-transparent hover:bg-lavender-100'
                  }`}
                >
                  <div className="font-medium text-lavender-800">{connection.name}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!growCloser}
                className="flex-1 py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 text-center">
            <div className="text-4xl mb-4">🌳</div>
            <h2 className="text-xl font-semibold text-lavender-800 mb-3">
              Thank you for reflecting
            </h2>

            <p className="text-lavender-600 mb-6 leading-relaxed">
              Small moments build strong roots.
            </p>

            <div className="bg-muted-teal-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-muted-teal-700 italic">
                &ldquo;The quality of your life is the quality of your relationships.&rdquo;
              </p>
              <p className="text-xs text-muted-teal-600 mt-2">— Tony Robbins</p>
            </div>

            {/* Summary */}
            {(mostConnected || growCloser) && (
              <div className="text-left mb-6 space-y-3">
                {mostConnected && (
                  <div className="bg-lavender-50 rounded-xl p-4">
                    <div className="text-xs text-lavender-500 mb-1">Felt most connected to</div>
                    <div className="text-lavender-800 font-medium">
                      {connections.find(c => c.id === mostConnected)?.name}
                    </div>
                  </div>
                )}
                {growCloser && (
                  <div className="bg-lavender-50 rounded-xl p-4">
                    <div className="text-xs text-lavender-500 mb-1">Want to grow closer to</div>
                    <div className="text-lavender-800 font-medium">
                      {connections.find(c => c.id === growCloser)?.name}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link
              href="/"
              className="inline-block w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors text-center"
            >
              Back to Today
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
