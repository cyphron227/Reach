'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { RelationshipStrength } from '@/types/habitEngine'
import { CatchupFrequency } from '@/types/database'
import { getContactPalette } from '@/lib/ringCalculations'

export interface CircleContact {
  id: string
  name: string
  strength: RelationshipStrength
  catchupFrequency: CatchupFrequency
}

interface CirclesViewProps {
  contacts: CircleContact[]
  onTapContact: (contactId: string) => void
}

// Circle diameter by relationship strength
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

// Target radius from Me centre per catch-up frequency
const FREQ_BASE_RADIUS: Record<CatchupFrequency, number> = {
  daily:      75,
  weekly:     92,
  biweekly:  107,
  monthly:   122,
  quarterly: 137,
  biannually:152,
  annually:  165,
}

// Strength modifier on top of frequency radius — kept small so frequency dominates
const STRENGTH_RADIUS_MOD: Record<RelationshipStrength, number> = {
  flourishing:  -8,
  strong:        -4,
  stable:         0,
  thinning:      +6,
  decaying:     +10,
}

const FADING_COLOR = '#C46A4A'
const ME_SIZE = 64
const ME_R = ME_SIZE / 2

function strengthColor(strength: RelationshipStrength, name: string): string {
  if (strength === 'thinning' || strength === 'decaying') return FADING_COLOR
  return getContactPalette(name).inner
}

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h) + name.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h)
}

interface PhysicsNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  targetR: number
  size: number  // diameter
}

interface SettledPos {
  id: string
  x: number
  y: number
}

function runPhysics(contacts: CircleContact[], maxR: number): SettledPos[] {
  if (contacts.length === 0) return []

  // Initialise nodes spread evenly around their target radius
  const nodes: PhysicsNode[] = contacts.map((c, i) => {
    const baseR = FREQ_BASE_RADIUS[c.catchupFrequency]
    const mod = STRENGTH_RADIUS_MOD[c.strength]
    const size = CIRCLE_SIZE[c.strength]
    const minR = ME_R + size / 2 + 6
    const targetR = Math.max(minR, Math.min(maxR - size / 2 - 4, baseR + mod))
    const angle = (i / contacts.length) * Math.PI * 2 + 0.3 * i  // slight offset to avoid symmetry
    return {
      id: c.id,
      x: Math.cos(angle) * targetR,
      y: Math.sin(angle) * targetR,
      vx: 0,
      vy: 0,
      targetR,
      size,
    }
  })

  // Simulation loop
  for (let iter = 0; iter < 300; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i]
      const dist = Math.sqrt(p.x * p.x + p.y * p.y) || 0.001

      // 1. Radial spring toward targetR — stronger pull to close gaps
      const springF = (p.targetR - dist) * 0.18
      p.vx += (p.x / dist) * springF
      p.vy += (p.y / dist) * springF

      // 2. Centre exclusion — keep away from Me circle
      const minCenterDist = ME_R + p.size / 2 + 6
      if (dist < minCenterDist) {
        const push = (minCenterDist - dist) / dist * 0.6
        p.vx += p.x * push
        p.vy += p.y * push
      }

      // 3. Boundary wall — keep within canvas
      if (dist > maxR - p.size / 2 - 4) {
        const over = dist - (maxR - p.size / 2 - 4)
        const inward = over / dist * 0.18
        p.vx -= p.x * inward
        p.vy -= p.y * inward
      }

      // 4. Circle-circle collision
      for (let j = i + 1; j < nodes.length; j++) {
        const q = nodes[j]
        const dx = p.x - q.x
        const dy = p.y - q.y
        const dd = Math.sqrt(dx * dx + dy * dy) || 0.001
        const minSep = p.size / 2 + q.size / 2 + 10
        if (dd < minSep) {
          const pushF = (minSep - dd) / dd * 0.35
          p.vx += dx * pushF
          p.vy += dy * pushF
          q.vx -= dx * pushF
          q.vy -= dy * pushF
        }
      }

      // 5. Damping
      p.vx *= 0.78
      p.vy *= 0.78

      // 6. Integrate
      p.x += p.vx
      p.y += p.vy
    }
  }

  return nodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
}

// Pre-compute per-contact drift params from name hash so the origin offset can be subtracted
function getDriftParams(name: string) {
  const h = hashName(name)
  const phaseX = (h % 628) / 100
  const phaseY = ((h * 7) % 628) / 100
  const speedX = 0.008 + (h % 4) * 0.002
  const speedY = 0.006 + ((h * 3) % 4) * 0.002
  // origin offset — the value of the sine at tick=0, subtracted each frame so drift always starts at 0
  const originDx = Math.sin(phaseX) * 8
  const originDy = Math.cos(phaseY) * 8
  return { phaseX, phaseY, speedX, speedY, originDx, originDy }
}

export default function CirclesView({ contacts, onTapContact }: CirclesViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<SettledPos[]>([])
  const [settled, setSettled] = useState(false)
  const [driftStarted, setDriftStarted] = useState(false)
  const [driftTick, setDriftTick] = useState(0)

  // Pre-compute drift params per contact (stable across ticks)
  const driftParams = useMemo(
    () => Object.fromEntries(contacts.map(c => [c.id, getDriftParams(c.name)])),
    [contacts]
  )

  // Run physics simulation once container dimensions are known
  useEffect(() => {
    const el = containerRef.current
    if (!el || contacts.length === 0) {
      setPositions([])
      return
    }
    const w = el.clientWidth
    const h = el.clientHeight
    const maxR = Math.min(w, h) / 2 - 4
    const result = runPhysics(contacts, maxR)
    setPositions(result)
  }, [contacts])

  // Trigger settle-in after positions are computed
  useEffect(() => {
    if (positions.length === 0 && contacts.length > 0) return
    const t = setTimeout(() => setSettled(true), 150)
    return () => clearTimeout(t)
  }, [positions, contacts.length])

  // Start drift after all circles have finished settling
  useEffect(() => {
    if (!settled) return
    const settleEndMs = 150 + contacts.length * 80 + 700 + 400
    const t = setTimeout(() => setDriftStarted(true), settleEndMs)
    return () => clearTimeout(t)
  }, [settled, contacts.length])

  // 30fps drift tick
  useEffect(() => {
    if (!driftStarted) return
    const id = setInterval(() => setDriftTick(t => t + 1), 33)
    return () => clearInterval(id)
  }, [driftStarted])

  const getDriftOffset = useCallback((contactId: string) => {
    if (!driftStarted) return { dx: 0, dy: 0 }
    const p = driftParams[contactId]
    if (!p) return { dx: 0, dy: 0 }
    const amp = 8
    return {
      // Subtract origin so drift starts exactly at settled position (no jump)
      dx: Math.sin(driftTick * p.speedX + p.phaseX) * amp - p.originDx,
      dy: Math.cos(driftTick * p.speedY + p.phaseY) * amp - p.originDy,
    }
  }, [driftStarted, driftTick, driftParams])

  const posMap = new Map(positions.map(p => [p.id, p]))

  return (
    <div
      ref={containerRef}
      className="bg-bone dark:bg-dark-bg"
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100dvh - 56px)',
        overflow: 'hidden',
      }}
    >
      {/* Contact circles */}
      {contacts.map((contact, i) => {
        const pos = posMap.get(contact.id)
        const settled_x = pos?.x ?? 0
        const settled_y = pos?.y ?? 0
        const { dx, dy } = getDriftOffset(contact.id)
        const x = settled_x + dx
        const y = settled_y + dy

        const size = CIRCLE_SIZE[contact.strength]
        const opacity = CIRCLE_OPACITY[contact.strength]
        const color = strengthColor(contact.strength, contact.name)
        const firstName = contact.name.split(' ')[0]
        const fontSize = Math.max(7, Math.min(12, Math.round(size * 0.22)))
        const delay = i * 80

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
              transition: driftStarted
                ? 'none'
                : `transform 700ms cubic-bezier(0.4,0,0.2,1) ${delay}ms, opacity 500ms ease ${delay}ms`,
              cursor: 'pointer',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
                border: '1.5px solid rgba(0,0,0,0.10)',
                boxShadow: `0 0 0 3px ${color}28`,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize,
                  fontWeight: 600,
                  color: 'rgba(246,245,243,0.92)',
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  userSelect: 'none',
                  maxWidth: size - 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  textAlign: 'center',
                  padding: '0 2px',
                }}
              >
                {firstName}
              </span>
            </div>
          </div>
        )
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
