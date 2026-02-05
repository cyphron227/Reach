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
      // Check for hash fragment (Supabase sends tokens in URL hash for recovery)
      const hash = window.location.hash
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (accessToken && type === 'recovery') {
          // Set the session from the recovery tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            setLinkExpired(true)
            setChecking(false)
            return
          }

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

      setMessage('Password updated successfully! Redirecting...')
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
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading...</div>
      </main>
    )
  }

  if (linkExpired) {
    return (
      <main className="min-h-screen bg-lavender-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-2xl font-semibold text-lavender-800 mb-2">
            Link Expired
          </h1>
          <p className="text-lavender-500 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
          >
            Back to Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-lavender-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-lavender-800 mb-2">
            Set New Password
          </h1>
          <p className="text-lavender-500">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-lavender-700 mb-1">
              New Password
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-lavender-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 placeholder-lavender-400 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {message && (
            <p className="text-muted-teal-600 text-sm bg-muted-teal-50 p-3 rounded-lg">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </main>
  )
}
