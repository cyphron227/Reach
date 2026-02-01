/**
 * Native intent utilities for initiating communication
 * Uses URL schemes that Android WebView handles natively
 */

import { formatForWhatsApp } from './phone'

/**
 * Initiate a phone call using ACTION_DIAL
 * Opens the dialer with the number pre-filled (user must press call)
 */
export function initiateCall(phoneNumber: string): void {
  window.location.href = `tel:${phoneNumber}`
}

/**
 * Open WhatsApp chat with a phone number
 * Expects E.164 formatted number (e.g., +447911123456)
 * Uses wa.me deep link format with digits only (no +, spaces, or symbols)
 */
export function initiateWhatsApp(e164PhoneNumber: string): void {
  // Use formatForWhatsApp to ensure correct format: digits only, no +
  const cleanPhone = formatForWhatsApp(e164PhoneNumber)
  window.open(`https://wa.me/${cleanPhone}`, '_blank')
}

/**
 * Open SMS app with phone number
 */
export function initiateText(phoneNumber: string): void {
  window.location.href = `sms:${phoneNumber}`
}

/**
 * Open email client with recipient
 */
export function initiateEmail(emailAddress: string): void {
  window.location.href = `mailto:${emailAddress}`
}
