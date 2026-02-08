/**
 * OAuth utilities for Google Sign-In
 * Handles both web and Capacitor native app flows
 *
 * Uses @supabase/supabase-js directly (not @supabase/ssr) with flowType: 'implicit'
 * because @supabase/ssr forces PKCE flow and the code_verifier cookie gets lost
 * during OAuth redirects. Implicit flow returns hash tokens instead, which the
 * callback page handles via setSession().
 */

import { createClient } from '@supabase/supabase-js'
import { getOAuthCallbackUrl, isCapacitor } from '@/lib/capacitor'
import { Browser } from '@capacitor/browser'

export type OAuthProvider = 'google'

/**
 * Initiate OAuth sign-in flow
 * Opens the OAuth provider in the appropriate way for web vs native
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  // Use base supabase-js with implicit flow to avoid PKCE code_verifier storage issues.
  // @supabase/ssr's createBrowserClient forces PKCE which loses the verifier during redirects.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } }
  )

  const redirectTo = getOAuthCallbackUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true, // Always handle redirect manually
    },
  })

  if (error) {
    throw error
  }

  if (!data.url) {
    throw new Error('No OAuth URL returned')
  }

  if (isCapacitor()) {
    await Browser.open({ url: data.url })
  } else {
    // Redirect manually on web
    window.location.href = data.url
  }
}
