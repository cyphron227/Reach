'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackContent() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const type = searchParams.get('type')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (errorParam) {
        setError(errorDescription || errorParam)
        return
      }

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setError(exchangeError.message)
          return
        }

        // Wait a moment for session to persist before redirecting
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if this is a password recovery flow
        // Either from URL param or from the session's amr (authentication methods reference)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userAmr = (data.session?.user as any)?.amr as Array<{ method: string }> | undefined
        const isRecovery = type === 'recovery' ||
          userAmr?.some(m => m.method === 'recovery')

        if (isRecovery) {
          router.replace('/auth/update-password')
          return
        }

        router.replace('/')
        return
      }

      // No code present - check if we have a session from hash fragment (implicit flow)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/')
        return
      }

      setError('No authentication code provided')
    }

    handleCallback()
  }, [searchParams, supabase.auth, router])

  if (error) {
    return (
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-lavender-100 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">:(</div>
          <h1 className="text-lg font-semibold text-lavender-800 mb-2">Authentication Error</h1>
          <p className="text-lavender-600 text-sm mb-6">{error}</p>
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
    <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-teal-500 mx-auto mb-4"></div>
        <p className="text-lavender-600">Completing sign in...</p>
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-teal-500 mx-auto mb-4"></div>
          <p className="text-lavender-600">Loading...</p>
        </div>
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
