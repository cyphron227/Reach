/**
 * Contact picker utilities for importing contacts on native platforms
 */

import { Contacts } from '@capacitor-community/contacts'
import { isCapacitor } from './capacitor'

export interface SelectedContact {
  name: string
  phoneNumbers: string[]
  emails: string[]
}

/**
 * Check if contacts permission is granted
 */
export async function checkContactsPermission(): Promise<boolean> {
  if (!isCapacitor()) return false

  try {
    const status = await Contacts.checkPermissions()
    return status.contacts === 'granted'
  } catch {
    return false
  }
}

/**
 * Request contacts permission
 * Returns true if permission granted
 */
export async function requestContactsPermission(): Promise<boolean> {
  if (!isCapacitor()) return false

  try {
    // First check current status
    const status = await Contacts.checkPermissions()
    console.log('Current contacts permission status:', status.contacts)

    if (status.contacts === 'granted') {
      return true
    }

    // Request permission (works for 'prompt' or 'prompt-with-rationale')
    const result = await Contacts.requestPermissions()
    console.log('After request, contacts permission status:', result.contacts)

    return result.contacts === 'granted'
  } catch (error) {
    console.error('Failed to request contacts permission:', error)
    return false
  }
}

/**
 * Open native contact picker and return selected contact
 * Throws an error if permission denied
 * Returns null if user cancelled
 */
export async function pickContact(): Promise<SelectedContact | null> {
  if (!isCapacitor()) return null

  // Check and request permissions first
  const status = await Contacts.checkPermissions()
  console.log('Contacts permission status:', status.contacts)

  if (status.contacts !== 'granted') {
    // Request permission
    const result = await Contacts.requestPermissions()
    console.log('After request, permission status:', result.contacts)

    if (result.contacts !== 'granted') {
      throw new Error('Contacts permission denied')
    }
  }

  // Now pick the contact
  const result = await Contacts.pickContact({
    projection: {
      name: true,
      phones: true,
      emails: true,
    }
  })

  if (!result.contact) return null

  const contact = result.contact

  return {
    name: contact.name?.display || contact.name?.given || 'Unknown',
    phoneNumbers: (contact.phones || []).map(p => p.number).filter(Boolean) as string[],
    emails: (contact.emails || []).map(e => e.address).filter(Boolean) as string[],
  }
}

/**
 * Format phone number for display (removes extra whitespace)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove extra whitespace but keep formatting
  return phone.replace(/\s+/g, ' ').trim()
}
