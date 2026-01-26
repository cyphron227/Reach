/**
 * Local notification utilities for Ringur catch-up reminders
 */

import { LocalNotifications } from '@capacitor/local-notifications'
import { isCapacitor } from './capacitor'
import { Connection } from '@/types/database'

// Frequency to days mapping
const frequencyToDays: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
}

/**
 * Generate a stable numeric ID from connection UUID
 * Capacitor local notifications require numeric IDs
 */
function connectionIdToNotificationId(connectionId: string): number {
  let hash = 0
  for (let i = 0; i < connectionId.length; i++) {
    const char = connectionId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Calculate the due date for a connection
 * Returns null if no due date can be determined
 */
function getConnectionDueDate(connection: Connection): Date | null {
  if (connection.next_catchup_date) {
    return new Date(connection.next_catchup_date)
  }

  if (connection.last_interaction_date) {
    const lastInteraction = new Date(connection.last_interaction_date)
    const frequencyDays = frequencyToDays[connection.catchup_frequency] || 30
    const dueDate = new Date(lastInteraction)
    dueDate.setDate(dueDate.getDate() + frequencyDays)
    return dueDate
  }

  return null
}

/**
 * Request notification permissions (required for Android 13+)
 * Returns true if permissions granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isCapacitor()) return false

  try {
    const permStatus = await LocalNotifications.checkPermissions()

    if (permStatus.display === 'granted') {
      return true
    }

    if (permStatus.display === 'denied') {
      // User has permanently denied - they need to enable in settings
      return false
    }

    // Request permission
    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted'
  } catch (error) {
    console.error('Failed to request notification permissions:', error)
    return false
  }
}

/**
 * Check if notifications are permitted
 */
export async function areNotificationsPermitted(): Promise<boolean> {
  if (!isCapacitor()) return false

  try {
    const permStatus = await LocalNotifications.checkPermissions()
    return permStatus.display === 'granted'
  } catch {
    return false
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!isCapacitor()) return

  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id }))
      })
    }
  } catch (error) {
    console.error('Failed to cancel notifications:', error)
  }
}

/**
 * Cancel notification for a specific connection
 */
export async function cancelConnectionNotification(connectionId: string): Promise<void> {
  if (!isCapacitor()) return

  try {
    const notificationId = connectionIdToNotificationId(connectionId)
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }]
    })
  } catch (error) {
    console.error('Failed to cancel notification:', error)
  }
}

/**
 * Schedule notifications for connections due today or in the near future
 *
 * @param connections - Array of connections to schedule notifications for
 * @param notificationTime - Time string in HH:MM format (e.g., "09:00")
 * @param daysAhead - How many days ahead to schedule (default 7)
 */
export async function scheduleConnectionNotifications(
  connections: Connection[],
  notificationTime: string = '09:00',
  daysAhead: number = 7
): Promise<void> {
  if (!isCapacitor()) return

  // Check permissions first
  const hasPermission = await areNotificationsPermitted()
  if (!hasPermission) {
    console.log('Notifications not permitted, skipping scheduling')
    return
  }

  // Cancel existing notifications to reschedule fresh
  await cancelAllNotifications()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const futureLimit = new Date(today)
  futureLimit.setDate(futureLimit.getDate() + daysAhead)

  // Parse notification time
  const [hours, minutes] = notificationTime.split(':').map(Number)

  const notificationsToSchedule: Array<{
    id: number
    title: string
    body: string
    schedule: { at: Date; allowWhileIdle: boolean }
    extra: { connectionId: string; connectionName: string }
    smallIcon: string
    channelId: string
  }> = []

  for (const connection of connections) {
    const dueDate = getConnectionDueDate(connection)
    if (!dueDate) continue

    // Reset time part for comparison
    const dueDateStart = new Date(dueDate)
    dueDateStart.setHours(0, 0, 0, 0)

    // Schedule if due today or within the lookahead window
    if (dueDateStart >= today && dueDateStart <= futureLimit) {
      const notificationId = connectionIdToNotificationId(connection.id)

      // Schedule for the specified time on the due date
      const scheduleAt = new Date(dueDateStart)
      scheduleAt.setHours(hours, minutes, 0, 0)

      // Don't schedule if the time has already passed today
      if (scheduleAt <= new Date()) {
        continue
      }

      notificationsToSchedule.push({
        id: notificationId,
        title: `Time to reach out to ${connection.name}`,
        body: connection.relationship
          ? `Your ${connection.relationship} is due for a catch-up!`
          : 'Time for a catch-up!',
        schedule: {
          at: scheduleAt,
          allowWhileIdle: true,
        },
        extra: {
          connectionId: connection.id,
          connectionName: connection.name,
        },
        smallIcon: 'ic_stat_notify',
        channelId: 'catchup_reminders',
      })
    }
  }

  if (notificationsToSchedule.length > 0) {
    try {
      // Create notification channel for Android
      await LocalNotifications.createChannel({
        id: 'catchup_reminders',
        name: 'Catch-up Reminders',
        description: 'Reminders to catch-up with your connections',
        importance: 4, // HIGH
        visibility: 1, // PUBLIC
        sound: 'default',
        vibration: true,
      })

      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      })

      console.log(`Scheduled ${notificationsToSchedule.length} notifications`)
    } catch (error) {
      console.error('Failed to schedule notifications:', error)
    }
  }
}

/**
 * Register listener for notification tap events
 * Returns a cleanup function to remove the listener
 */
export function registerNotificationTapListener(
  onTap: (connectionId: string) => void
): () => void {
  if (!isCapacitor()) return () => {}

  const listenerPromise = LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (notification) => {
      const connectionId = notification.notification.extra?.connectionId
      if (connectionId) {
        onTap(connectionId)
      }
    }
  )

  return () => {
    listenerPromise.then(l => l.remove())
  }
}
