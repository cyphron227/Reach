import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[AuthCallback Route] Params:', { code: code?.slice(0, 10), type, error })

  // Handle errors from Supabase
  if (error) {
    console.error('[AuthCallback Route] Error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[AuthCallback Route] Exchange error:', exchangeError.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    console.log('[AuthCallback Route] Session established')

    // Check if this is a password recovery flow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userAmr = (data.session?.user as any)?.amr as Array<{ method: string }> | undefined
    const isRecovery = type === 'recovery' || userAmr?.some(m => m.method === 'recovery')

    console.log('[AuthCallback Route] isRecovery:', isRecovery, 'AMR:', userAmr)

    if (isRecovery) {
      return NextResponse.redirect(`${origin}/auth/update-password`)
    }

    return NextResponse.redirect(`${origin}/`)
  }

  // No code provided
  console.error('[AuthCallback Route] No code provided')
  return NextResponse.redirect(`${origin}/login?error=No authentication code provided`)
}
