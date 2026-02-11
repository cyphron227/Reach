'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, UserSettings } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  isCapacitor,
  requestNotificationPermissions,
  cancelAllNotifications,
} from '@/lib/capacitor'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notificationTime, setNotificationTime] = useState('18:00')
  const [weeklyReflectionEnabled, setWeeklyReflectionEnabled] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    // Fetch user profile
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    setUser(userData)
    setFullName(userData?.full_name || '')

    // Fetch or create user settings
    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (settingsData) {
      const settings = settingsData as UserSettings
      setSettings(settings)
      setNotificationsEnabled(settings.notifications_enabled)
      // PostgreSQL time type returns "18:00:00" but dropdown uses "18:00"
      // Normalize by taking only HH:MM portion
      const normalizedTime = settings.notification_time?.substring(0, 5) || '18:00'
      setNotificationTime(normalizedTime)
      setWeeklyReflectionEnabled(settings.weekly_reflection_enabled)
    } else {
      // Create default settings
      const { data: newSettings } = await supabase
        .from('user_settings')
        .insert({
          user_id: authUser.id,
          notifications_enabled: true,
          notification_time: '18:00',
          weekly_reflection_enabled: true,
        })
        .select()
        .single()

      if (newSettings) {
        setSettings(newSettings as UserSettings)
      }
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle notification toggle with permission request
  const handleNotificationToggle = async () => {
    const newValue = !notificationsEnabled

    if (newValue && isCapacitor()) {
      // Request permissions when enabling
      const granted = await requestNotificationPermissions()

      if (!granted) {
        setMessage({
          type: 'error',
          text: 'Please enable notifications in your device settings'
        })
        return
      }
    } else if (!newValue && isCapacitor()) {
      // Cancel all notifications when disabling
      await cancelAllNotifications()
    }

    setNotificationsEnabled(newValue)
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setMessage(null)

    const { data, error } = await supabase
      .from('user_settings')
      .update({
        notifications_enabled: notificationsEnabled,
        notification_time: notificationTime,
        weekly_reflection_enabled: weeklyReflectionEnabled,
      })
      .eq('id', settings.id)
      .select()
      .single()

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      // Update local state with the saved values
      if (data) {
        setSettings(data as UserSettings)
      }
      setMessage({ type: 'success', text: 'Settings saved' })
      setTimeout(() => setMessage(null), 3000)
    }

    setSaving(false)
  }

  const handleSaveName = async () => {
    if (!user) return

    setSavingName(true)
    setMessage(null)

    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update name' })
    } else {
      setUser({ ...user, full_name: fullName.trim() })
      setMessage({ type: 'success', text: 'Name updated' })
      setEditingName(false)
      setTimeout(() => setMessage(null), 3000)
    }

    setSavingName(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return

    setDeleting(true)
    setMessage(null)

    try {
      // Get the access token to authenticate the request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Determine the API URL - use full URL for Capacitor, relative for web
      // Note: trailing slash is required due to next.config trailingSlash: true
      let apiUrl = '/api/delete-account/'
      if (isCapacitor()) {
        const deployedUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!deployedUrl) {
          throw new Error('Account deletion is not available in the app yet. Please use the web version.')
        }
        apiUrl = `${deployedUrl}/api/delete-account/`
      }

      // Call the API route to delete account (requires admin privileges)
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        let errorMessage = 'Failed to delete account'
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          // Response wasn't valid JSON
          errorMessage = `Server error (${response.status})`
        }
        throw new Error(errorMessage)
      }

      // Sign out locally and redirect
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete account. Please try again.'
      })
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-bone flex items-center justify-center">
        <div className="text-text-tertiary">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bone">
      <div className="max-w-lg mx-auto px-6 pt-8 pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-text-tertiary hover:text-obsidian text-micro transition-colors duration-calm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="text-body-medium text-obsidian">Settings</div>
          <div className="w-12" />
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-lg p-6 shadow-card mb-6">
          <h2 className="text-label text-inkblue mb-4">
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <div className="text-micro-medium text-text-tertiary mb-1">Name</div>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md bg-bone-warm border-none text-obsidian focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm text-body"
                    placeholder="Your name"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName || !fullName.trim()}
                    className="px-3 py-2 bg-moss hover:opacity-90 text-bone text-micro-medium rounded-md transition-all duration-calm disabled:opacity-50"
                  >
                    {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false)
                      setFullName(user?.full_name || '')
                    }}
                    className="px-3 py-2 bg-bone-warm hover:bg-bone-warm text-obsidian text-micro-medium rounded-md transition-all duration-calm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-body text-obsidian">{user?.full_name || 'Not set'}</div>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-moss hover:opacity-80 text-micro-medium transition-colors duration-calm"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div>
              <div className="text-micro-medium text-text-tertiary">Email</div>
              <div className="text-body text-obsidian">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-lg p-6 shadow-card mb-6">
          <h2 className="text-label text-inkblue mb-4">
            Notifications
          </h2>

          <div className="space-y-5">
            {/* Daily Reminder Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-body-medium text-obsidian">Daily reminder</div>
                <div className="text-micro text-text-secondary">Get a gentle nudge to reach out</div>
              </div>
              <button
                onClick={handleNotificationToggle}
                className={`relative w-12 h-7 rounded-full transition-colors duration-calm ${
                  notificationsEnabled ? 'bg-moss' : 'bg-bone-warm'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-bone shadow transition-transform duration-calm ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notification Time */}
            {notificationsEnabled && (
              <div>
                <div className="text-body-medium text-obsidian mb-2">Reminder time</div>
                <select
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-md bg-bone-warm border-none text-obsidian focus:outline-none focus:ring-1 focus:ring-moss/40 transition-all duration-calm"
                >
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                  <option value="21:00">9:00 PM</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Reflection Section */}
        <div className="bg-white rounded-lg p-6 shadow-card mb-6">
          <h2 className="text-label text-inkblue mb-4">
            Weekly reflection
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-body-medium text-obsidian">Weekly check-in</div>
              <div className="text-micro text-text-secondary">Reflect on your connections each week</div>
            </div>
            <button
              onClick={() => setWeeklyReflectionEnabled(!weeklyReflectionEnabled)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-calm ${
                weeklyReflectionEnabled ? 'bg-moss' : 'bg-bone-warm'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-bone shadow transition-transform duration-calm ${
                  weeklyReflectionEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 px-4 bg-moss hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-md text-center text-micro mb-4 ${
            message.type === 'success'
              ? 'bg-bone-warm text-moss'
              : 'bg-bone-warm text-ember'
          }`}>
            {message.text}
          </div>
        )}

        {/* Privacy Note */}
        <div className="bg-bone-warm rounded-md p-4 mb-6">
          <div>
            <div className="text-micro-medium text-obsidian">Your data is private</div>
            <div className="text-micro text-text-secondary">
              All your connections and catch-ups are stored securely and only visible to you.
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 px-4 bg-bone-warm hover:bg-bone-warm text-obsidian font-medium rounded-md transition-all duration-calm mb-8"
        >
          Sign out
        </button>

        {/* Danger Zone */}
        <div className="border-t border-bone-warm pt-8">
          <h2 className="text-label text-ember mb-4">
            Danger zone
          </h2>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 px-4 bg-ember hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 pt-4 pb-safe"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              setShowDeleteModal(false)
              setDeleteConfirmText('')
            }
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-md shadow-modal p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-bone-warm flex items-center justify-center">
                <svg className="w-5 h-5 text-ember" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-h3 text-obsidian">Delete account</h2>
            </div>

            <div className="bg-bone-warm rounded-md p-4 mb-6">
              <p className="text-micro-medium text-ember mb-2">
                This action cannot be undone.
              </p>
              <p className="text-micro text-obsidian">
                All your data will be permanently deleted, including:
              </p>
              <ul className="text-micro text-text-secondary mt-2 ml-4 list-disc">
                <li>Your profile and settings</li>
                <li>All your connections</li>
                <li>All interaction history and memories</li>
                <li>Streaks and achievements</li>
              </ul>
            </div>

            <div className="mb-6">
              <label className="block text-micro-medium text-text-tertiary mb-2">
                Type <span className="font-bold text-ember">delete</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="delete"
                disabled={deleting}
                className="w-full px-4 py-3 rounded-md bg-bone-warm border-none text-obsidian focus:outline-none focus:ring-1 focus:ring-ember/30 transition-all duration-calm disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={deleting}
                className="flex-1 py-3 px-4 bg-bone-warm hover:bg-bone-warm text-obsidian font-medium rounded-md transition-all duration-calm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== 'delete' || deleting}
                className="flex-1 py-3 px-4 bg-ember hover:opacity-90 text-bone font-medium rounded-md transition-all duration-calm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
