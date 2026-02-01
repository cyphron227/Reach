/**
 * Phone number utilities using libphonenumber-js
 * Normalizes phone numbers to E.164 format for reliable deep linking
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

// Default country code for parsing local numbers
const DEFAULT_COUNTRY: CountryCode = 'GB'

export interface PhoneParseResult {
  /** Original input as entered by user */
  raw: string
  /** E.164 format (e.g., +447911123456) or null if invalid */
  e164: string | null
  /** Whether the number is valid */
  isValid: boolean
  /** Error message if invalid */
  error?: string
}

/**
 * Parse and normalize a phone number to E.164 format
 * @param phoneNumber - The phone number to parse (can be local or international)
 * @param defaultCountry - Country code to use if number doesn't include country code (default: GB)
 * @returns PhoneParseResult with raw, e164, and validity info
 */
export function parsePhone(
  phoneNumber: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): PhoneParseResult {
  const raw = phoneNumber.trim()

  if (!raw) {
    return {
      raw: '',
      e164: null,
      isValid: false,
      error: 'No phone number provided'
    }
  }

  try {
    // First check if it's valid with the given country
    if (!isValidPhoneNumber(raw, defaultCountry)) {
      // Try without country code (might already have international format)
      if (!isValidPhoneNumber(raw)) {
        return {
          raw,
          e164: null,
          isValid: false,
          error: 'Invalid phone number format'
        }
      }
    }

    // Parse the number
    const parsed = parsePhoneNumber(raw, defaultCountry)

    if (!parsed || !parsed.isValid()) {
      return {
        raw,
        e164: null,
        isValid: false,
        error: 'Could not parse phone number'
      }
    }

    // Get E.164 format (e.g., +447911123456)
    const e164 = parsed.format('E.164')

    return {
      raw,
      e164,
      isValid: true
    }
  } catch (err) {
    return {
      raw,
      e164: null,
      isValid: false,
      error: err instanceof Error ? err.message : 'Failed to parse phone number'
    }
  }
}

/**
 * Format E.164 number for WhatsApp deep link
 * WhatsApp requires: no +, no spaces, no symbols - just digits
 * @param e164 - E.164 formatted number (e.g., +447911123456)
 * @returns Number formatted for wa.me (e.g., 447911123456)
 */
export function formatForWhatsApp(e164: string): string {
  // Remove the leading + and any non-digit characters
  return e164.replace(/\D/g, '')
}

/**
 * Format phone number for display (national format if possible)
 * @param e164 - E.164 formatted number
 * @returns Formatted number for display, or original if parsing fails
 */
export function formatForDisplay(e164: string | null, raw?: string): string {
  if (!e164) {
    return raw || ''
  }

  try {
    const parsed = parsePhoneNumber(e164)
    if (parsed) {
      return parsed.formatNational()
    }
  } catch {
    // Fall through to return raw
  }

  return raw || e164
}

/**
 * Check if a phone number can be used for WhatsApp
 * @param e164 - E.164 formatted number (or null)
 * @returns true if the number is valid for WhatsApp
 */
export function canUseWhatsApp(e164: string | null): boolean {
  if (!e164) return false

  // E.164 numbers start with + followed by country code
  // WhatsApp needs a valid international number
  return e164.startsWith('+') && e164.length >= 8
}
