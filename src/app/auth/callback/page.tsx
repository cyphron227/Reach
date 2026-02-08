'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const type = searchParams.get('type')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (errorParam) {
        router.replace(`/login/?error=${encodeURIComponent(errorDescription || errorParam)}`)
        return
      }

      if (!code) {
        router.replace('/login/?error=No authentication code provided')
        return
      }

      console.log('[AuthCallback] Exchanging code for session...')
      const supabase = createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[AuthCallback] Exchange error:', exchangeError.message)
        setError(exchangeError.message)
        router.replace(`/login/?error=${encodeURIComponent(exchangeError.message)}`)
        return
      }

      console.log('[AuthCallback] Session established, redirecting...')
      if (type === 'recovery') {
        router.replace('/auth/update-password/')
      } else {
        router.replace('/')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
      <div className="text-lavender-400">{error ? 'Redirecting...' : 'Signing in...'}</div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Signing in...</div>
      </main>
    }>
      <CallbackContent />
    </Suspense>
  )
}
