'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, UserSettings } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notificationTime, setNotificationTime] = useState('18:00')
  const [weeklyReflectionEnabled, setWeeklyReflectionEnabled] = useState(true)

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
      setNotificationTime(settings.notification_time)
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

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('user_settings')
      .update({
        notifications_enabled: notificationsEnabled,
        notification_time: notificationTime,
        weekly_reflection_enabled: weeklyReflectionEnabled,
      })
      .eq('id', settings.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      setMessage({ type: 'success', text: 'Settings saved' })
      setTimeout(() => setMessage(null), 3000)
    }

    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-lavender-50 flex items-center justify-center">
        <div className="text-lavender-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-lavender-50">
      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-lavender-400 hover:text-lavender-600 text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="text-muted-teal-500 font-semibold text-lg">Settings</div>
          <div className="w-12" />
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100 mb-6">
          <h2 className="text-sm font-medium text-lavender-500 uppercase tracking-wide mb-4">
            Profile
          </h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-lavender-400">Name</div>
              <div className="text-lavender-800">{user?.full_name || 'Not set'}</div>
            </div>
            <div>
              <div className="text-xs text-lavender-400">Email</div>
              <div className="text-lavender-800">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100 mb-6">
          <h2 className="text-sm font-medium text-lavender-500 uppercase tracking-wide mb-4">
            Notifications
          </h2>

          <div className="space-y-5">
            {/* Daily Reminder Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lavender-800 font-medium">Daily reminder</div>
                <div className="text-sm text-lavender-500">Get a gentle nudge to reach out</div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-muted-teal-400' : 'bg-lavender-200'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notification Time */}
            {notificationsEnabled && (
              <div>
                <div className="text-lavender-800 font-medium mb-2">Reminder time</div>
                <select
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all"
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-lavender-100 mb-6">
          <h2 className="text-sm font-medium text-lavender-500 uppercase tracking-wide mb-4">
            Weekly Reflection
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-lavender-800 font-medium">Weekly check-in</div>
              <div className="text-sm text-lavender-500">Reflect on your connections each week</div>
            </div>
            <button
              onClick={() => setWeeklyReflectionEnabled(!weeklyReflectionEnabled)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                weeklyReflectionEnabled ? 'bg-muted-teal-400' : 'bg-lavender-200'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
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
          className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-xl text-center text-sm mb-4 ${
            message.type === 'success'
              ? 'bg-muted-teal-50 text-muted-teal-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Privacy Note */}
        <div className="bg-lavender-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-lg">🔒</span>
            <div>
              <div className="text-sm font-medium text-lavender-700">Your data is private</div>
              <div className="text-xs text-lavender-500">
                All your connections and interactions are stored securely and only visible to you.
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium rounded-xl transition-colors"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
