'use client'

import { useEffect, useState, ReactNode } from 'react'
import { ThemeProvider } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'

export default function Providers({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [])

  return (
    <ThemeProvider userId={userId}>
      {children}
    </ThemeProvider>
  )
}
