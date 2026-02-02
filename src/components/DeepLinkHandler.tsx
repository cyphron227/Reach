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

    const setupListener = async () => {
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')

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

        if (fullPath.includes('auth/callback')) {
          router.push(`/auth/callback${search}`)
        } else if (fullPath.includes('auth/update-password')) {
          router.push(`/auth/update-password${search}`)
        }
      })

      cleanup = () => {
        listener.remove()
      }
    }

    setupListener()

    return () => {
      cleanup?.()
    }
  }, [router])

  return null // This component renders nothing
}
