'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Checking authentication...')
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebug = (msg: string) => {
    console.log(`[AuthCallback] ${msg}`)
    setDebugInfo(prev => [...prev, msg])
  }

  useEffect(() => {
    const handleCallback = async () => {
      const fullUrl = window.location.href
      const hash = window.location.hash
      const code = searchParams.get('code')
      const type = searchParams.get('type')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      addDebug(`URL: ${fullUrl}`)
      addDebug(`Code: ${code ? code.substring(0, 10) + '...' : 'none'}`)
      addDebug(`Hash: ${hash ? hash.substring(0, 50) + '...' : 'none'}`)
      addDebug(`Error param: ${errorParam || 'none'}`)

      // Handle errors from Supabase
      if (errorParam) {
        setStatus(`Error: ${errorDescription || errorParam}`)
        setTimeout(() => router.replace(`/login/?error=${encodeURIComponent(errorDescription || errorParam)}`), 3000)
        return
      }

      // Handle hash tokens (implicit flow - #access_token=...&type=recovery)
      if (hash && hash.includes('access_token')) {
        addDebug('Detected hash tokens (implicit flow)')
        setStatus('Setting session from tokens...')
        const supabase = createClient()

        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) {
            addDebug(`setSession error: ${sessionError.message}`)
            setStatus(`Error: ${sessionError.message}`)
            return
          }
          addDebug('Session set from hash tokens')
          const hashType = hashParams.get('type')
          if (hashType === 'recovery') {
            router.replace('/auth/update-password/')
          } else {
            router.replace('/')
          }
          return
        }
      }

      // Handle PKCE code exchange (?code=xxx)
      if (code) {
        addDebug('Exchanging PKCE code for session...')
        setStatus('Signing in...')
        const supabase = createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          addDebug(`Exchange error: ${exchangeError.message}`)
          setStatus(`Error: ${exchangeError.message}`)
          setTimeout(() => router.replace(`/login/?error=${encodeURIComponent(exchangeError.message)}`), 3000)
          return
        }

        addDebug('Session established, redirecting...')
        setStatus('Redirecting...')
        if (type === 'recovery') {
          router.replace('/auth/update-password/')
        } else {
          router.replace('/')
        }
        return
      }

      // No code or hash
      addDebug('No code or hash tokens found')
      setStatus('No authentication data found')
      setTimeout(() => router.replace('/login/?error=No authentication code provided'), 3000)
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <main className="min-h-screen bg-bone flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-ash mb-4">{status}</div>
        {debugInfo.length > 0 && (
          <div className="text-left bg-bone rounded-md p-4 shadow-card text-micro text-ash space-y-1">
            {debugInfo.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-ash">Signing in...</div>
      </main>
    }>
      <CallbackContent />
    </Suspense>
  )
}
