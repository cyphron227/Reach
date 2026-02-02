'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getPasswordResetRedirectUrl } from '@/lib/capacitor'
import { signInWithOAuth } from '@/lib/oauth'

// Rate limiting configuration
const EMAIL_RATE_LIMIT_SECONDS = 60
const RATE_LIMIT_STORAGE_KEY = 'email_rate_limit'

interface RateLimitData {
  lastEmailSent: number
  email: string
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [rateLimitSecondsRemaining, setRateLimitSecondsRemaining] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const checkRateLimit = useCallback(() => {
    if (!email) {
      setRateLimitSecondsRemaining(0)
      return
    }

    try {
      const storedData = localStorage.getItem(RATE_LIMIT_STORAGE_KEY)
      if (!storedData) {
        setRateLimitSecondsRemaining(0)
        return
      }

      const rateLimitData: RateLimitData = JSON.parse(storedData)

      // Check if the rate limit is for the same email
      if (rateLimitData.email !== email) {
        setRateLimitSecondsRemaining(0)
        return
      }

      const now = Date.now()
      const timeSinceLastEmail = Math.floor((now - rateLimitData.lastEmailSent) / 1000)
      const remainingSeconds = EMAIL_RATE_LIMIT_SECONDS - timeSinceLastEmail

      if (remainingSeconds > 0) {
        setRateLimitSecondsRemaining(remainingSeconds)
      } else {
        setRateLimitSecondsRemaining(0)
      }
    } catch {
      // If there's any error parsing, clear the rate limit
      setRateLimitSecondsRemaining(0)
    }
  }, [email])

  // Check rate limit on mount and when email changes
  useEffect(() => {
    checkRateLimit()
  }, [email, checkRateLimit])

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitSecondsRemaining > 0) {
      const timer = setTimeout(() => {
        setRateLimitSecondsRemaining(rateLimitSecondsRemaining - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [rateLimitSecondsRemaining])

  const setRateLimit = (emailAddress: string) => {
    const rateLimitData: RateLimitData = {
      lastEmailSent: Date.now(),
      email: emailAddress,
    }
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(rateLimitData))
    setRateLimitSecondsRemaining(EMAIL_RATE_LIMIT_SECONDS)
  }

  const isRateLimited = () => {
    return rateLimitSecondsRemaining > 0
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) throw error

        // If email confirmation is disabled, user is immediately logged in
        if (data.session) {
          router.push('/')
          router.refresh()
          return
        }

        // If email confirmation is enabled, show message
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
    setShowResetPassword(false)
    setError(null)
    setMessage(null)
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      await signInWithOAuth('google')
      // For web, the page will redirect
      // For Capacitor, the browser opens and DeepLinkHandler handles the callback
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      // Check rate limit before sending email
      if (isRateLimited()) {
        setError(`Please wait ${rateLimitSecondsRemaining} seconds before requesting another password reset email.`)
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      })

      if (error) {
        // Handle Supabase rate limit errors
        if (error.message.includes('email_rate_limit') || error.message.includes('rate limit')) {
          setRateLimit(email)
          throw new Error('Too many email requests. Please wait a minute before trying again.')
        }
        throw error
      }

      // Set rate limit after successful email send
      setRateLimit(email)
      setMessage('Check your email for a password reset link.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Hero Landing Page
  if (!showAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-lavender-50 via-muted-teal-50 to-frozen-water-50 animate-gradient relative overflow-hidden">
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
              <h1 className="text-5xl font-semibold text-lavender-800 mb-4">Ringur</h1>
              <p className="text-xl text-lavender-600 leading-relaxed">
                Stay close to who matters
              </p>
            </div>

            {/* Hero Description */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/50 mb-8">
              <p className="text-lavender-700 text-lg leading-relaxed mb-6">
                Life gets busy. Friendships drift. <span className="text-muted-teal-600 font-medium">Ringur</span> helps you nurture the relationships that matter most with gentle reminders and meaningful memories.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🌿</span>
                  <div>
                    <div className="font-medium text-lavender-800">Gentle Nudges</div>
                    <div className="text-sm text-lavender-500">A gentle nudge when it might be time to reach out</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">💭</span>
                  <div>
                    <div className="font-medium text-lavender-800">Memories</div>
                    <div className="text-sm text-lavender-500">Remember what matters before your next conversation</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🌳</span>
                  <div>
                    <div className="font-medium text-lavender-800">Forest View</div>
                    <div className="text-sm text-lavender-500">Watch your relationships flourish as a living garden</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              {/* Google Sign-In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-4 px-6 bg-white hover:bg-lavender-50 text-lavender-700 font-medium rounded-xl transition-all shadow-md border border-lavender-100 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lavender-500"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-lavender-200/50"></div>
                <span className="text-lavender-400 text-sm">or</span>
                <div className="flex-1 h-px bg-lavender-200/50"></div>
              </div>

              <button
                onClick={() => handleGetStarted(true)}
                className="w-full py-4 px-6 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] shadow-md"
              >
                Get Started with Email
              </button>
              <button
                onClick={() => handleGetStarted(false)}
                className="w-full py-4 px-6 bg-white/80 hover:bg-white text-lavender-700 font-medium rounded-xl transition-all border border-lavender-200"
              >
                Sign In with Email
              </button>
            </div>

            {/* Subtle footer */}
            <p className="mt-8 text-sm text-lavender-400">
              Small moments build strong roots 🌱
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Password Reset Form
  if (showResetPassword) {
    return (
      <main className="min-h-screen bg-lavender-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button
            onClick={() => {
              setShowResetPassword(false)
              setError(null)
              setMessage(null)
            }}
            className="mb-6 text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to sign in
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-lavender-800 mb-2">
              Reset Password
            </h1>
            <p className="text-lavender-500">
              Enter your email to receive a reset link
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-lavender-700 mb-1">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            {message && (
              <p className="text-muted-teal-600 text-sm bg-muted-teal-50 p-3 rounded-lg">{message}</p>
            )}

            {rateLimitSecondsRemaining > 0 && (
              <p className="text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
                Please wait {rateLimitSecondsRemaining} second{rateLimitSecondsRemaining !== 1 ? 's' : ''} before requesting another email.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || rateLimitSecondsRemaining > 0}
              className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : rateLimitSecondsRemaining > 0 ? `Wait ${rateLimitSecondsRemaining}s` : 'Send reset link'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  // Auth Form
  return (
    <main className="min-h-screen bg-lavender-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Back button */}
        <button
          onClick={() => setShowAuth(false)}
          className="mb-6 text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-lavender-800 mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-lavender-500">
            {isSignUp ? 'Start nurturing your relationships' : 'Continue where you left off'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-lavender-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-lavender-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-lavender-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(true)
                  setError(null)
                  setMessage(null)
                }}
                className="text-muted-teal-600 hover:text-muted-teal-700 text-sm transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {message && (
            <p className="text-muted-teal-600 text-sm bg-muted-teal-50 p-3 rounded-lg">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-lavender-200"></div>
            <span className="text-lavender-400 text-sm">or</span>
            <div className="flex-1 h-px bg-lavender-200"></div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 bg-white border border-lavender-200 hover:bg-lavender-50 text-lavender-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lavender-500"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setMessage(null)
            }}
            className="text-muted-teal-600 hover:text-muted-teal-700 text-sm transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </main>
  )
}
