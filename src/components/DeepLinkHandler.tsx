'use client'

/**
 * Deep link handler for Capacitor OAuth callbacks
 * Listens for app URL open events and routes to the appropriate page
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isCapacitor } from '@/lib/capacitor'

export function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!isCapacitor()) return

    let cleanup: (() => void) | undefined
    let mounted = true

    const setupListener = async () => {
      try {
        const { App } = await import('@capacitor/app')
        const { Browser } = await import('@capacitor/browser')

        // Check if component is still mounted before setting up listener
        if (!mounted) return

        const listener = await App.addListener('appUrlOpen', async (event) => {
          // Close the browser that was opened for OAuth
          try {
            await Browser.close()
          } catch {
            // Browser may already be closed
          }

          // Parse the deep link URL
          // Format: com.dangur.ringur://auth/callback?code=...
          // Note: In this URL format, 'auth' becomes the host and '/callback' is the path
          const url = new URL(event.url)
          const fullPath = `${url.host || ''}${url.pathname || ''}`
          const search = url.search || ''
          const hash = url.hash || ''

          if (fullPath.includes('auth/callback')) {
            // Route to the callback page - it handles the code exchange client-side
            router.push(`/auth/callback${search}${hash}`)
          } else if (fullPath.includes('auth/update-password')) {
            router.push(`/auth/update-password${search}${hash}`)
          }
        })

        cleanup = () => {
          listener.remove()
        }
      } catch (error) {
        // Log error but don't crash - deep links will just not work
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to setup deep link handler:', error)
        }
      }
    }

    setupListener()

    return () => {
      mounted = false
      cleanup?.()
    }
  }, [router])

  return null // This component renders nothing
}
