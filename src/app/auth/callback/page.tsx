'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      // Check the URL hash for recovery token (Supabase sends tokens in hash for implicit flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      if (accessToken && type === 'recovery') {
        // This is a password recovery - set the session and redirect to update password
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        })

        if (!error) {
          router.push('/auth/update-password')
          return
        }
      }

      // For PKCE flow, check if there's already a session
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Check if this might be a recovery session by looking at aal
        // or just redirect to home since the route.ts should have handled it
        router.push('/')
      } else {
        router.push('/login')
      }
    }

    handleCallback()
  }, [supabase, router])

  return (
    <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
      <div className="text-lavender-400">Processing...</div>
    </main>
  )
}
