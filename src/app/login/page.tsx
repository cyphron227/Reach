'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: fullName,
            },
          },
        })
        if (error) throw error
        setMessage('Check your email for a confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGetStarted = (signUp: boolean) => {
    setIsSignUp(signUp)
    setShowAuth(true)
    setError(null)
    setMessage(null)
  }

  // Hero Landing Page
  if (!showAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sage-50 via-cream to-sage-100 animate-gradient relative overflow-hidden">
        {/* Floating decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 text-4xl opacity-20 animate-float">🌱</div>
          <div className="absolute top-40 right-20 text-5xl opacity-15 animate-float-delayed">🌳</div>
          <div className="absolute bottom-40 left-20 text-3xl opacity-20 animate-float-delayed">💭</div>
          <div className="absolute bottom-20 right-10 text-4xl opacity-15 animate-float">🌿</div>
          <div className="absolute top-1/2 left-1/4 text-2xl opacity-10 animate-pulse-soft">✨</div>
          <div className="absolute top-1/3 right-1/3 text-2xl opacity-10 animate-pulse-soft">✨</div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            {/* Logo and Tagline */}
            <div className="mb-12">
              <h1 className="text-5xl font-semibold text-warmgray-800 mb-4">Reach</h1>
              <p className="text-xl text-warmgray-600 leading-relaxed">
                Stay close to who matters
              </p>
            </div>

            {/* Hero Description */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/50 mb-8">
              <p className="text-warmgray-700 text-lg leading-relaxed mb-6">
                Life gets busy. Friendships drift. <span className="text-sage-600 font-medium">Reach</span> helps you nurture the relationships that matter most with gentle reminders and meaningful memories.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🌳</span>
                  <div>
                    <div className="font-medium text-warmgray-800">Forest View</div>
                    <div className="text-sm text-warmgray-500">Watch your relationships flourish as a living garden</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">💭</span>
                  <div>
                    <div className="font-medium text-warmgray-800">Memories</div>
                    <div className="text-sm text-warmgray-500">Remember what matters before your next conversation</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🌿</span>
                  <div>
                    <div className="font-medium text-warmgray-800">Gentle Nudges</div>
                    <div className="text-sm text-warmgray-500">Never let important connections fade away</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleGetStarted(true)}
                className="w-full py-4 px-6 bg-sage-400 hover:bg-sage-500 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] shadow-md"
              >
                Get Started — It&apos;s Free
              </button>
              <button
                onClick={() => handleGetStarted(false)}
                className="w-full py-4 px-6 bg-white/80 hover:bg-white text-warmgray-700 font-medium rounded-xl transition-all border border-warmgray-200"
              >
                Sign In
              </button>
            </div>

            {/* Subtle footer */}
            <p className="mt-8 text-sm text-warmgray-400">
              Small moments build strong roots 🌱
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Auth Form
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Back button */}
        <button
          onClick={() => setShowAuth(false)}
          className="mb-6 text-warmgray-400 hover:text-warmgray-600 text-sm transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-warmgray-800 mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-warmgray-500">
            {isSignUp ? 'Start nurturing your relationships' : 'Continue where you left off'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-warmgray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-warmgray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-warmgray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-warmgray-200 bg-white text-warmgray-800 placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {message && (
            <p className="text-sage-600 text-sm bg-sage-50 p-3 rounded-lg">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-sage-400 hover:bg-sage-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setMessage(null)
            }}
            className="text-sage-600 hover:text-sage-700 text-sm transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </main>
  )
}
