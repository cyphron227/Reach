/**
 * Capacitor utilities for handling native app functionality
 */

// The app's custom URL scheme for deep links
const APP_SCHEME = 'com.dangur.ringur'

/**
 * Detect if the app is running inside Capacitor (native mobile)
 */
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Capacitor's native bridge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

/**
 * Get the appropriate redirect URL for auth callbacks
 * Returns the native deep link URL when in Capacitor, otherwise the web URL
 */
export function getAuthRedirectUrl(path: string): string {
  if (isCapacitor()) {
    // Use deep link scheme for native app
    return `${APP_SCHEME}:/${path}`
  }

  // Use web origin for browser
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }

  return path
}

/**
 * Get the redirect URL for password reset
 */
export function getPasswordResetRedirectUrl(): string {
  return getAuthRedirectUrl('/auth/update-password')
}

/**
 * Get the redirect URL for OAuth callback
 */
export function getOAuthCallbackUrl(): string {
  return getAuthRedirectUrl('/auth/callback')
}

// Re-export notification utilities
export {
  requestNotificationPermissions,
  areNotificationsPermitted,
  cancelAllNotifications,
  cancelConnectionNotification,
  scheduleConnectionNotifications,
  registerNotificationTapListener,
} from './notifications'

// Re-export contact utilities
export {
  checkContactsPermission,
  requestContactsPermission,
  pickContact,
  formatPhoneNumber,
  type SelectedContact,
} from './contacts'

// Re-export intent utilities
export {
  initiateCall,
  initiateWhatsApp,
  initiateText,
  initiateEmail,
} from './intents'
