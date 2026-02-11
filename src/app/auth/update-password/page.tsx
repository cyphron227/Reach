'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [linkExpired, setLinkExpired] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let unsubscribe: (() => void) | null = null

    const handleRecovery = async () => {
      // Check for PKCE code first (mobile/Capacitor sends ?code=xxx instead of hash tokens)
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      console.log('[UpdatePassword] Code param:', code ? code.substring(0, 10) + '...' : 'none')

      if (code) {
        console.log('[UpdatePassword] Exchanging PKCE code for session...')
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error('[UpdatePassword] Code exchange error:', error.message)
          setLinkExpired(true)
          setChecking(false)
          return
        }

        console.log('[UpdatePassword] Session set from PKCE code exchange')
        // Clear the code from URL for cleaner look
        window.history.replaceState(null, '', window.location.pathname)
        setChecking(false)
        return
      }

      // Check for hash fragment (Supabase sends tokens in URL hash for recovery on web)
      const hash = window.location.hash
      console.log('[UpdatePassword] Hash:', hash ? hash.substring(0, 50) + '...' : 'none')

      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        console.log('[UpdatePassword] Hash params - type:', type, 'hasAccessToken:', !!accessToken)

        if (accessToken && type === 'recovery') {
          // Set the session from the recovery tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('[UpdatePassword] setSession error:', error.message)
            setLinkExpired(true)
            setChecking(false)
            return
          }

          console.log('[UpdatePassword] Session set from hash tokens')
          // Clear the hash from URL for cleaner look
          window.history.replaceState(null, '', window.location.pathname)
          setChecking(false)
          return
        }
      }

      // No hash fragment - session may have been set by auth callback
      // Use onAuthStateChange to properly detect the session
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          // Session found, allow password update
          setChecking(false)
          if (timeoutId) clearTimeout(timeoutId)
        }
      })
      unsubscribe = () => subscription.unsubscribe()

      // Also check immediately for existing session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[UpdatePassword] Checking session:', !!session, session?.user?.email)
      if (session) {
        setChecking(false)
        return
      }

      // Give it a few seconds for session to propagate from callback
      timeoutId = setTimeout(() => {
        // Still no session after waiting, redirect to login
        router.push('/login')
      }, 3000)
    }

    handleRecovery()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (unsubscribe) unsubscribe()
    }
  }, [supabase, router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setMessage('Password updated successfully. Redirecting...')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-text-tertiary">Loading...</div>
      </main>
    )
  }

  if (linkExpired) {
    return (
      <main className="min-h-screen bg-bone flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-h1 font-medium text-obsidian mb-2">
            Link Expired
          </h1>
          <p className="text-text-secondary mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm"
          >
            Back to Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bone flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-h1 font-medium text-obsidian mb-2">
            Set New Password
          </h1>
          <p className="text-text-secondary">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-micro-medium text-text-tertiary mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-md border-none bg-bone-warm text-obsidian placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-micro-medium text-text-tertiary mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-md border-none bg-bone-warm text-obsidian placeholder:text-text-placeholder focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-ember text-body bg-bone-warm p-3 rounded-md">{error}</p>
          )}

          {message && (
            <p className="text-moss text-body bg-bone-warm p-3 rounded-md">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-moss hover:bg-moss/90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </main>
  )
}
