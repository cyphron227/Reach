'use client'

import { useState, useEffect, useMemo } from 'react'
import { RelationshipStrength, RingTier } from '@/types/habitEngine'
import { getContactPalette } from '@/lib/ringCalculations'

export interface CircleContact {
  id: string
  name: string
  strength: RelationshipStrength
  ringTier: RingTier | null
}

interface CirclesViewProps {
  contacts: CircleContact[]
  onTapContact: (contactId: string) => void
}

const CIRCLE_SIZE: Record<RelationshipStrength, number> = {
  flourishing: 52,
  strong: 46,
  stable: 40,
  thinning: 34,
  decaying: 28,
}

const CIRCLE_OPACITY: Record<RelationshipStrength, number> = {
  flourishing: 0.90,
  strong: 0.75,
  stable: 0.58,
  thinning: 0.42,
  decaying: 0.30,
}

const FADING_COLOR = '#C46A4A'
const CORE_R = 110
const OUTER_R = 195
const ME_SIZE = 64

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

function strengthColor(strength: RelationshipStrength, name: string): string {
  if (strength === 'thinning' || strength === 'decaying') return FADING_COLOR
  return getContactPalette(name).inner
}

export default function CirclesView({ contacts, onTapContact }: CirclesViewProps) {
  const [settled, setSettled] = useState(false)
  const [orbitStarted, setOrbitStarted] = useState(false)
  const [coreAngle, setCoreAngle] = useState(0)
  const [outerAngle, setOuterAngle] = useState(0)

  const coreContacts = useMemo(() => contacts.filter(c => c.ringTier === 'core'), [contacts])
  const outerContacts = useMemo(() => contacts.filter(c => c.ringTier !== 'core'), [contacts])

  // Scale outer circles down proportionally when there are many contacts
  const outerScale = outerContacts.length > 20 ? Math.sqrt(20 / outerContacts.length) : 1

  // Trigger settle-in shortly after mount
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 150)
    return () => clearTimeout(t)
  }, [])

  // Start orbit after all circles have finished settling
  useEffect(() => {
    if (!settled) return
    const settleEndMs = 150 + contacts.length * 80 + 700 + 400
    const t = setTimeout(() => setOrbitStarted(true), settleEndMs)
    return () => clearTimeout(t)
  }, [settled, contacts.length])

  // 30fps orbit tick — very slow, ~12 min/revolution for core, ~20 min for outer
  useEffect(() => {
    if (!orbitStarted) return
    const id = setInterval(() => {
      setCoreAngle(a => a + 0.00027)
      setOuterAngle(a => a + 0.00017)
    }, 33)
    return () => clearInterval(id)
  }, [orbitStarted])

  function circlePos(index: number, total: number, radius: number, angleOffset: number) {
    const baseAngle = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2
    const angle = baseAngle + angleOffset
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  function renderContact(
    contact: CircleContact,
    globalIndex: number,
    x: number,
    y: number,
    isCore: boolean,
    sizeScale: number,
  ) {
    const rawSize = CIRCLE_SIZE[contact.strength]
    const size = Math.max(24, Math.round(rawSize * sizeScale))
    const opacity = CIRCLE_OPACITY[contact.strength]
    const color = strengthColor(contact.strength, contact.name)
    const delay = globalIndex * 80

    return (
      <div
        key={contact.id}
        onClick={() => onTapContact(contact.id)}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size,
          height: size,
          marginLeft: -(size / 2),
          marginTop: -(size / 2),
          transform: settled
            ? `translate(${x}px, ${y}px) scale(1)`
            : 'translate(0px, 0px) scale(0)',
          opacity: settled ? 1 : 0,
          // Once orbit starts, remove transitions so direct angle updates are instant
          transition: orbitStarted
            ? 'none'
            : `transform 700ms cubic-bezier(0.4,0,0.2,1) ${delay}ms, opacity 500ms ease ${delay}ms`,
          cursor: 'pointer',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            opacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid rgba(255,255,255,0.15)',
            boxShadow: `0 0 0 3px ${color}28`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: Math.max(8, Math.round(size * 0.28)),
              fontWeight: 600,
              color: 'rgba(246,245,243,0.92)',
              lineHeight: 1,
              letterSpacing: '-0.01em',
              userSelect: 'none',
            }}
          >
            {getInitials(contact.name)}
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            color: isCore ? 'rgba(246,245,243,0.65)' : 'rgba(246,245,243,0.42)',
            marginTop: 3,
            whiteSpace: 'nowrap',
            maxWidth: size + 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          {contact.name.split(' ')[0]}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100dvh - 56px)',
        background: '#0C0D10',
        overflow: 'hidden',
      }}
    >
      {/* Orbit track rings — faint dashed guides */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {coreContacts.length > 0 && (
          <circle
            cx="50%" cy="50%"
            r={CORE_R}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="3 9"
          />
        )}
        {outerContacts.length > 0 && (
          <circle
            cx="50%" cy="50%"
            r={OUTER_R}
            fill="none"
            stroke="rgba(255,255,255,0.035)"
            strokeWidth="1"
            strokeDasharray="3 9"
          />
        )}
      </svg>

      {/* Orbit labels */}
      {coreContacts.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `calc(50% - ${CORE_R + 16}px)`,
            transform: 'translateX(-50%)',
            zIndex: 2,
            pointerEvents: 'none',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.16)',
            userSelect: 'none',
          }}
        >
          Core
        </div>
      )}
      {outerContacts.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `calc(50% - ${OUTER_R + 16}px)`,
            transform: 'translateX(-50%)',
            zIndex: 2,
            pointerEvents: 'none',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.10)',
            userSelect: 'none',
          }}
        >
          Outer
        </div>
      )}

      {/* Core contacts */}
      {coreContacts.map((contact, i) => {
        const { x, y } = circlePos(i, coreContacts.length, CORE_R, coreAngle)
        return renderContact(contact, i, x, y, true, 1)
      })}

      {/* Outer contacts */}
      {outerContacts.map((contact, i) => {
        const { x, y } = circlePos(i, outerContacts.length, OUTER_R, outerAngle)
        return renderContact(contact, coreContacts.length + i, x, y, false, outerScale)
      })}

      {/* Me circle — always centred, above everything */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: ME_SIZE,
          height: ME_SIZE,
          marginLeft: -(ME_SIZE / 2),
          marginTop: -(ME_SIZE / 2),
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="animate-gentlePulse"
          style={{
            width: ME_SIZE,
            height: ME_SIZE,
            borderRadius: '50%',
            background: '#5F7A6A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.22)',
            boxShadow: '0 0 0 8px rgba(95,122,106,0.12), 0 0 28px rgba(95,122,106,0.10)',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(246,245,243,0.95)',
              letterSpacing: '0.03em',
              userSelect: 'none',
            }}
          >
            Me
          </span>
        </div>
      </div>
    </div>
  )
}
