'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (pref: ThemePreference) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

export function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  try { localStorage.setItem('ringur-theme', theme) } catch { /* storage unavailable */ }
}

export function ThemeProvider({ children, userId }: { children: ReactNode; userId?: string | null }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  // Load preference from Supabase + apply
  useEffect(() => {
    if (!userId) {
      const resolved = resolveTheme('system')
      setResolvedTheme(resolved)
      applyTheme(resolved)
      return
    }
    const supabase = createClient()
    supabase
      .from('user_settings')
      .select('theme_preference')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        const pref = (data?.theme_preference as ThemePreference | undefined) ?? 'system'
        setPreferenceState(pref)
        const resolved = resolveTheme(pref)
        setResolvedTheme(resolved)
        applyTheme(resolved)
      })
  }, [userId])

  // Listen for system preference changes when mode is 'system'
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const resolved: ResolvedTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const setPreference = useCallback(async (newPref: ThemePreference) => {
    setPreferenceState(newPref)
    const resolved = resolveTheme(newPref)
    setResolvedTheme(resolved)
    applyTheme(resolved)

    if (userId) {
      const supabase = createClient()
      await supabase
        .from('user_settings')
        .update({ theme_preference: newPref })
        .eq('user_id', userId)
    }
  }, [userId])

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Default fallback when used outside ThemeProvider (e.g. during SSR prerender)
const defaultThemeContext: ThemeContextType = {
  preference: 'system',
  resolvedTheme: 'light',
  setPreference: async () => {},
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  return ctx ?? defaultThemeContext
}
