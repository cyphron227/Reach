import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[AuthCallback Route] Full URL:', url.toString())
  console.log('[AuthCallback Route] Origin:', origin)
  console.log('[AuthCallback Route] Params:', { code: code?.slice(0, 10), type, error })

  // Handle errors from Supabase
  if (error) {
    console.error('[AuthCallback Route] Error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/login/?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    // Create a response that we'll add cookies to
    const redirectUrl = type === 'recovery'
      ? `${origin}/auth/update-password/`
      : `${origin}/`

    const response = NextResponse.redirect(redirectUrl)

    // Create Supabase client that will set cookies on our response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[AuthCallback Route] Exchange error:', exchangeError.message)
      return NextResponse.redirect(`${origin}/login/?error=${encodeURIComponent(exchangeError.message)}`)
    }

    console.log('[AuthCallback Route] Session established, redirecting to:', redirectUrl)
    return response
  }

  // No code provided
  console.error('[AuthCallback Route] No code provided')
  return NextResponse.redirect(`${origin}/login/?error=No authentication code provided`)
}
