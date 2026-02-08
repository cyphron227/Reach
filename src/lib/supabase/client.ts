import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use implicit flow to avoid PKCE code_verifier cookie being lost
        // during OAuth redirects. The callback page handles hash tokens.
        flowType: 'implicit',
      },
    }
  )
}
