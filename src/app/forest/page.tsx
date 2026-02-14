'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Connection, CatchupFrequency, ConnectionHealthV2, RelationshipStrength } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CatchupMethodModal from '@/components/CatchupMethodModal'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { deriveStrengthFromRecency, getContactPalette } from '@/lib/ringCalculations'
import CirclesView, { CircleContact } from '@/components/CirclesView'
import { RingTier } from '@/types/habitEngine'

const frequencyToDays: Record<CatchupFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
  annually: 365,
}

function getDaysSince(dateString: string | null | undefined): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function getTimeAgoText(dateString: string | null | undefined): string {
  const days = getDaysSince(dateString)
  if (days === null) return 'Never connected'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
}

// Keep frequencyToDays reference to avoid unused-var warning
void frequencyToDays

export default function MyCirclesPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [showCatchupModal, setShowCatchupModal] = useState(false)
  const [connectionHealthMap, setConnectionHealthMap] = useState<Record<string, ConnectionHealthV2>>({})
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data: connectionsData } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', authUser.id)
      .order('name', { ascending: true })

    setConnections(connectionsData || [])

    try {
      const strengthEnabled = await isFeatureEnabled('relationship_strength_v2', authUser.id)

      if (strengthEnabled && connectionsData && connectionsData.length > 0) {
        const { data: healthData } = await (supabase as ReturnType<typeof createClient>)
          .from('connection_health_v2' as 'users')
          .select('*')
          .eq('user_id', authUser.id)

        if (healthData && Array.isArray(healthData)) {
          const healthMap: Record<string, ConnectionHealthV2> = {}
          for (const h of healthData as unknown as ConnectionHealthV2[]) {
            healthMap[h.connection_id] = h
          }
          setConnectionHealthMap(healthMap)
        }
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Scroll lock when modal open
  useEffect(() => {
    if (selectedConnection) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedConnection])

  // Enrich connections into CircleContact format
  const circleContacts = useMemo<CircleContact[]>(() => {
    return connections.map(conn => {
      const health = connectionHealthMap[conn.id]
      const daysSince = getDaysSince(conn.last_interaction_date)
      const strength: RelationshipStrength =
        health?.current_strength ??
        deriveStrengthFromRecency(daysSince, conn.catchup_frequency)
      const ringTier: RingTier | null = health?.ring_tier ?? null
      return { id: conn.id, name: conn.name, strength, ringTier }
    })
  }, [connections, connectionHealthMap])

  const selectedCircle = selectedConnection
    ? circleContacts.find(c => c.id === selectedConnection.id)
    : null

  const circleColor = selectedCircle
    ? (selectedCircle.strength === 'thinning' || selectedCircle.strength === 'decaying'
      ? '#C46A4A'
      : getContactPalette(selectedCircle.name).inner)
    : '#5F7A6A'

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#0C0D10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 14 }}>
          Loading your circles...
        </span>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0C0D10' }}>
      {/* Header */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0C0D10',
        }}
      >
        <Link
          href="/"
          style={{
            position: 'absolute',
            left: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'rgba(255,255,255,0.38)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Today
        </Link>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(246,245,243,0.90)',
            letterSpacing: '0.01em',
          }}
        >
          My Circles
        </span>
      </div>

      {/* Empty state */}
      {connections.length === 0 ? (
        <div
          style={{
            height: 'calc(100vh - 56px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '0 32px',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(95,122,106,0.12)',
              border: '1px solid rgba(95,122,106,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(95,122,106,0.70)' }}>Me</span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.35)',
              textAlign: 'center',
              maxWidth: 260,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Add connections to see your circles.
          </p>
          <Link
            href="/"
            style={{ fontSize: 13, color: '#5F7A6A', textDecoration: 'none', marginTop: 4 }}
          >
            Go back
          </Link>
        </div>
      ) : (
        <CirclesView
          contacts={circleContacts}
          onTapContact={(id) => {
            const conn = connections.find(c => c.id === id)
            if (conn) setSelectedConnection(conn)
          }}
        />
      )}

      {/* Contact detail bottom sheet */}
      {selectedConnection && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setSelectedConnection(null)}
        >
          <div
            style={{
              background: '#161821',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              maxWidth: 480,
              padding: '20px 24px 40px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.14)',
                margin: '0 auto 20px',
              }}
            />

            {/* Contact header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: circleColor,
                  opacity: 0.85,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(246,245,243,0.95)' }}>
                  {selectedConnection.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0].toUpperCase())
                    .join('')}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: 'rgba(246,245,243,0.95)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedConnection.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                  {getTimeAgoText(selectedConnection.last_interaction_date)}
                </div>
              </div>
              <button
                onClick={() => setSelectedConnection(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  color: 'rgba(255,255,255,0.28)',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Strength + tier pill */}
            {selectedCircle && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: '5px 12px',
                  marginBottom: 20,
                  fontSize: 12,
                  color: 'rgba(246,245,243,0.60)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background:
                      selectedCircle.strength === 'flourishing' ? '#5F7A6A' :
                      selectedCircle.strength === 'strong' ? '#4A7A96' :
                      selectedCircle.strength === 'stable' ? '#7A7A6A' :
                      '#C46A4A',
                    flexShrink: 0,
                  }}
                />
                {selectedCircle.strength.charAt(0).toUpperCase() + selectedCircle.strength.slice(1)}
                {selectedCircle.ringTier && (
                  <span style={{ opacity: 0.55 }}>
                    · {selectedCircle.ringTier === 'core' ? 'Core' : 'Outer'}
                  </span>
                )}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => setShowCatchupModal(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#5F7A6A',
                color: 'rgba(246,245,243,0.97)',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              Catch-up
            </button>
          </div>
        </div>
      )}

      {/* Catch-up Method Modal */}
      {selectedConnection && (
        <CatchupMethodModal
          connection={selectedConnection}
          isOpen={showCatchupModal}
          onClose={() => setShowCatchupModal(false)}
          onSuccess={() => {
            setShowCatchupModal(false)
            fetchData()
          }}
        />
      )}
    </main>
  )
}
