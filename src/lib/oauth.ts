/**
 * OAuth utilities for Google Sign-In
 * Handles both web and Capacitor native app flows
 */

import { createClient } from '@/lib/supabase/client'
import { getOAuthCallbackUrl, isCapacitor } from '@/lib/capacitor'
import { Browser } from '@capacitor/browser'

export type OAuthProvider = 'google'

/**
 * Initiate OAuth sign-in flow
 * Opens the OAuth provider in the appropriate way for web vs native
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  const supabase = createClient()
  const redirectTo = getOAuthCallbackUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: isCapacitor(), // Don't auto-redirect in native
    },
  })

  if (error) {
    throw error
  }

  // For Capacitor, open the OAuth URL in system browser
  if (isCapacitor() && data.url) {
    await Browser.open({ url: data.url })
  }
  // For web, Supabase handles the redirect automatically when skipBrowserRedirect is false
}
