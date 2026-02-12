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

// Simple hash function to avoid storing plain-text email
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

interface RateLimitData {
  lastEmailSent: number
  emailHash: string
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
      // Use sessionStorage to avoid persisting email data
      const storedData = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY)
      if (!storedData) {
        setRateLimitSecondsRemaining(0)
        return
      }

      const rateLimitData: RateLimitData = JSON.parse(storedData)

      // Check if the rate limit is for the same email (using hash comparison)
      if (rateLimitData.emailHash !== simpleHash(email.toLowerCase())) {
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
      emailHash: simpleHash(emailAddress.toLowerCase()),
    }
    // Use sessionStorage to avoid persisting email data
    sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(rateLimitData))
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

      const redirectUrl = getPasswordResetRedirectUrl()
      console.log('[PasswordReset] Redirect URL:', redirectUrl)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
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
      <main className="min-h-screen bg-bone dark:bg-dark-bg relative overflow-hidden">
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-6 pb-safe">
          <div className="max-w-md w-full text-center">
            {/* Logo and Tagline */}
            <div className="mb-12">
              <h1 className="text-5xl font-semibold text-obsidian dark:text-dark-text-primary mb-4">Ringur</h1>
              <p className="text-xl text-text-secondary dark:text-dark-text-secondary leading-relaxed">
                Stay close to who matters
              </p>
            </div>

            {/* Hero Description */}
            <div className="bg-white dark:bg-dark-surface rounded-lg p-8 shadow-card mb-8">
              <p className="text-obsidian dark:text-dark-text-primary text-lg leading-relaxed mb-6">
                Life gets busy. Friendships drift. <span className="text-moss font-medium">Ringur</span> helps you nurture the relationships that matter most with gentle reminders and meaningful memories.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-moss mt-2 shrink-0" />
                  <div>
                    <div className="text-body-medium text-obsidian dark:text-dark-text-primary">Gentle nudges</div>
                    <div className="text-micro text-text-secondary dark:text-dark-text-secondary">A gentle nudge when it might be time to reach out</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-inkblue mt-2 shrink-0" />
                  <div>
                    <div className="text-body-medium text-obsidian dark:text-dark-text-primary">Memories</div>
                    <div className="text-micro text-text-secondary dark:text-dark-text-secondary">Remember what matters before your next conversation</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-sun mt-2 shrink-0" />
                  <div>
                    <div className="text-body-medium text-obsidian dark:text-dark-text-primary">Forest view</div>
                    <div className="text-micro text-text-secondary dark:text-dark-text-secondary">Watch your relationships flourish as a living garden</div>
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
                className="w-full py-4 px-6 bg-bone-warm dark:bg-dark-surface-raised hover:bg-bone-warm dark:hover:bg-dark-surface-hover text-obsidian dark:text-dark-text-primary font-medium rounded-md transition-all duration-calm shadow-subtle flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="animate-gentle-pulse rounded-full h-5 w-5 border-b-2 border-text-placeholder"></div>
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
                <div className="flex-1 h-px bg-text-placeholder/20"></div>
                <span className="text-text-tertiary dark:text-dark-text-tertiary text-micro">or</span>
                <div className="flex-1 h-px bg-text-placeholder/20"></div>
              </div>

              <button
                onClick={() => handleGetStarted(true)}
                className="w-full py-4 px-6 bg-terracotta hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm shadow-card"
              >
                Get started with email
              </button>
              <button
                onClick={() => handleGetStarted(false)}
                className="w-full py-4 px-6 bg-bone-warm dark:bg-dark-surface-raised hover:bg-bone-warm dark:hover:bg-dark-surface-hover text-obsidian dark:text-dark-text-primary font-medium rounded-md transition-all duration-calm"
              >
                Sign in with email
              </button>
            </div>

            {/* Subtle footer */}
            <p className="mt-8 text-micro text-text-tertiary dark:text-dark-text-tertiary">
              Small moments build strong roots
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Password Reset Form
  if (showResetPassword) {
    return (
      <main className="min-h-screen bg-bone dark:bg-dark-bg flex flex-col items-center justify-center px-6 pt-6 pb-safe">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button
            onClick={() => {
              setShowResetPassword(false)
              setError(null)
              setMessage(null)
            }}
            className="mb-6 text-text-tertiary dark:text-dark-text-tertiary hover:text-obsidian dark:hover:text-dark-text-primary text-micro transition-colors duration-calm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to sign in
          </button>

          <div className="text-center mb-8">
            <h1 className="text-h2 text-obsidian dark:text-dark-text-primary mb-2">
              Reset password
            </h1>
            <p className="text-body text-text-secondary dark:text-dark-text-secondary">
              Enter your email to receive a reset link
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-micro-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-md bg-bone-warm dark:bg-dark-surface-raised border-none text-obsidian dark:text-dark-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="text-ember dark:text-dark-terracotta text-micro bg-bone-warm dark:bg-dark-surface-raised p-3 rounded-md">{error}</p>
            )}

            {message && (
              <p className="text-moss dark:text-dark-moss text-micro bg-bone-warm dark:bg-dark-surface-raised p-3 rounded-md">{message}</p>
            )}

            {rateLimitSecondsRemaining > 0 && (
              <p className="text-sun dark:text-dark-sun text-micro bg-bone-warm dark:bg-dark-surface-raised p-3 rounded-md">
                Please wait {rateLimitSecondsRemaining} second{rateLimitSecondsRemaining !== 1 ? 's' : ''} before requesting another email.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || rateLimitSecondsRemaining > 0}
              className="w-full py-3 px-4 bg-moss hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed"
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
    <main className="min-h-screen bg-bone dark:bg-dark-bg flex flex-col items-center justify-center px-6 pt-6 pb-safe">
      <div className="w-full max-w-sm">
        {/* Back button */}
        <button
          onClick={() => setShowAuth(false)}
          className="mb-6 text-text-tertiary dark:text-dark-text-tertiary hover:text-obsidian dark:hover:text-dark-text-primary text-micro transition-colors duration-calm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-h2 text-obsidian dark:text-dark-text-primary mb-2">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-body text-text-secondary dark:text-dark-text-secondary">
            {isSignUp ? 'Start nurturing your relationships' : 'Continue where you left off'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-micro-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-md bg-bone-warm dark:bg-dark-surface-raised border-none text-obsidian dark:text-dark-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-micro-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-md bg-bone-warm dark:bg-dark-surface-raised border-none text-obsidian dark:text-dark-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-micro-medium text-text-tertiary dark:text-dark-text-tertiary mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-md bg-bone-warm dark:bg-dark-surface-raised border-none text-obsidian dark:text-dark-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
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
                className="text-moss hover:opacity-80 text-micro transition-colors duration-calm"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <p className="text-ember dark:text-dark-terracotta text-micro bg-bone-warm dark:bg-dark-surface-raised p-3 rounded-md">{error}</p>
          )}

          {message && (
            <p className="text-moss dark:text-dark-moss text-micro bg-bone-warm dark:bg-dark-surface-raised p-3 rounded-md">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 bg-moss hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-text-placeholder/20"></div>
            <span className="text-text-tertiary dark:text-dark-text-tertiary text-micro">or</span>
            <div className="flex-1 h-px bg-text-placeholder/20"></div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 bg-bone-warm dark:bg-dark-surface-raised hover:bg-bone-warm dark:hover:bg-dark-surface-hover text-obsidian dark:text-dark-text-primary font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-subtle"
          >
            {googleLoading ? (
              <div className="animate-gentle-pulse rounded-full h-5 w-5 border-b-2 border-text-placeholder"></div>
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
            className="text-moss hover:opacity-80 text-micro transition-colors duration-calm"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </main>
  )
}
