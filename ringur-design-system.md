# Ringur Design System — Claude Code Prompt

Use this document as a system-level reference when building any UI for Ringur. Every component, screen, and interaction should comply with these rules. When in doubt, choose calm over clever.

---

## Brand Identity

Ringur is a mobile-first habit and relationship app focused on intentional connection, habit formation, emotional depth, and behavioural nudging. It is not a productivity tool, not a wellness app, not a gamified experience.

**Brand feel:** Calm momentum. Quiet confidence. Emotional clarity. Warm minimalism. Human-first, product-second. Trust over novelty. Depth over density. Supportive, not performative. Grounded, not playful. Serious about relationships.

**Ringur should feel like:** A quiet room, not a dashboard. A place for reflection, not stimulation. A system for stability, not dopamine.

---

## Design Tokens

### Colour System

```js
// tailwind.config.js — colors
colors: {
  obsidian: '#0F1115',    // Primary text, anchors, headings
  bone: '#F6F5F3',        // Backgrounds, canvas
  ash: '#A6A8AD',         // Secondary text, placeholders, metadata
  slate: '#2A2F3A',       // Surfaces, cards, dividers, dark UI
  moss: '#5F7A6A',        // Growth, connection, primary action
  ember: '#C46A4A',       // Decay, urgency, destructive action
  sun: '#E3B873',         // Pride, milestones, celebration
  inkblue: '#2F4C5F',     // Trust, reflection, informational
  // Surface variants
  'bone-warm': '#F0EEEA', // Slightly darker bone for layered surfaces
  'slate-light': '#3A4050', // Lighter slate for hover states
}
```

**Rules:**
- No neon colours anywhere
- No gradients (backgrounds, buttons, or accents)
- No candy colours or high-saturation accents
- No startup purple/violet palettes
- Accent colours (moss, ember, sun, inkblue) used sparingly — max 1 per screen section
- Bone is the default background. Slate is for elevated surfaces or dark-mode cards.
- Obsidian is primary text. Ash is secondary/supporting text.

### Typography

```js
// tailwind.config.js — fontFamily + fontSize
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
},
fontSize: {
  'h1': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '600' }],  // 30px
  'h2': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em', fontWeight: '600' }], // 22px
  'h3': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em', fontWeight: '500' }],   // 18px
  'body': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],                          // 15px
  'body-medium': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '500' }],                   // 15px medium
  'micro': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],                       // 13px
  'micro-medium': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }],                // 13px medium
  'label': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '500' }],    // 12px
}
```

**Rules:**
- Always sentence case. Never ALL CAPS. Never title case for UI labels.
- No shouting UI — keep hierarchy low-contrast (obsidian → ash, not obsidian → bold obsidian)
- Letter-spacing: slightly tight for headings (-0.02em), neutral for body, slightly open for labels (0.02em)
- Line heights are generous — 1.5x minimum for body text
- Font weight range: 400 (regular), 500 (medium), 600 (semibold). Never use 700/800/900.

### Spacing Scale

```js
// tailwind.config.js — spacing (extends default)
spacing: {
  'xs': '0.25rem',   // 4px  — micro gaps
  'sm': '0.5rem',    // 8px  — tight internal padding
  'md': '0.75rem',   // 12px — component internal padding
  'base': '1rem',    // 16px — standard gap
  'lg': '1.5rem',    // 24px — section padding
  'xl': '2rem',      // 32px — major section breaks
  '2xl': '3rem',     // 48px — page-level breathing room
  '3xl': '4rem',     // 64px — hero-level spacing
}
```

**Rules:**
- Default to generous spacing. When in doubt, add more space.
- Vertical rhythm between sections: minimum `xl` (32px)
- Card internal padding: `lg` (24px)
- List item vertical spacing: `md` to `base` (12–16px)
- Screen horizontal padding: `lg` (24px)

### Border Radius Scale

```js
borderRadius: {
  'sm': '8px',
  'md': '12px',
  'lg': '16px',
  'xl': '20px',
  'full': '9999px',
}
```

**Rules:**
- Buttons: `md` (12px)
- Cards: `lg` (16px)
- Avatars: `full`
- Input fields: `md` (12px)
- No sharp corners anywhere (minimum 8px radius)

### Shadow Scale

```js
boxShadow: {
  'subtle': '0 1px 3px rgba(15, 17, 21, 0.04)',
  'card': '0 2px 8px rgba(15, 17, 21, 0.06)',
  'elevated': '0 4px 16px rgba(15, 17, 21, 0.08)',
  'modal': '0 8px 32px rgba(15, 17, 21, 0.12)',
}
```

**Rules:**
- Shadows use obsidian-based rgba, never coloured shadows
- Default cards: `card`
- Modals/sheets: `modal`
- No hard borders as separators — use shadows or spacing
- Paper-like feel: soft, diffused, low-opacity shadows only

### Animation Tokens

```js
// tailwind.config.js — transition + keyframes
transitionDuration: {
  'calm': '300ms',
  'slow': '500ms',
  'deliberate': '700ms',
},
transitionTimingFunction: {
  'calm': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
},
keyframes: {
  fadeSlideUp: {
    '0%': { opacity: '0', transform: 'translateY(6px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  gentlePulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.7' },
  },
},
animation: {
  'fade-slide-up': 'fadeSlideUp 500ms cubic-bezier(0.4, 0, 0.2, 1)',
  'fade-in': 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  'gentle-pulse': 'gentlePulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
},
```

**Rules:**
- No bounce, elastic, spring, or overshoot animations
- Maximum translate distance: 8px (micro-slide)
- Fade + micro-slide for element entry
- Ease-in-out (cubic-bezier 0.4, 0, 0.2, 1) for all transitions
- Deliberate pacing — nothing should feel snappy or instant
- Motion tone: reassuring, not exciting
- Page transitions: fade-in at 300ms minimum
- List item stagger: 50ms delay between items

---

## Component Specifications

### Buttons

```
Primary:   bg-moss text-bone rounded-md px-6 py-3 font-medium text-body
Secondary: bg-slate text-bone rounded-md px-6 py-3 font-medium text-body
Danger:    bg-ember text-bone rounded-md px-6 py-3 font-medium text-body
Ghost:     bg-transparent text-obsidian rounded-md px-6 py-3 font-medium text-body
```

**Rules:**
- Solid fills only. No outlines, no gradients.
- Radius: 12px
- No playful hover effects. Hover = subtle opacity shift (0.9).
- Active/pressed = slight scale (0.98) + opacity (0.85)
- Disabled = 0.4 opacity
- No icon-only buttons without labels in primary flows
- Button text: sentence case, concise, action-oriented

### Cards / Containers

**Rules:**
- Background: bone or slate (for dark surfaces)
- Shadow: `card` level
- Radius: `lg` (16px)
- Padding: `lg` (24px)
- No hard borders. Separation via shadow + spacing.
- Paper-like feel — think quality stationery, not plastic UI

### Lists / Contact Items

**Rules:**
- No hard line separators between items
- Use spacing (12–16px gap) as visual separation
- If dividers needed: 1px line at ash with 0.15 opacity
- Identity-first layout: name/avatar prominent, metadata secondary
- Avatar: 44px, rounded-full, subtle shadow
- Name: body-medium in obsidian
- Metadata: micro in ash

### Input Fields

```
bg-bone-warm border-none rounded-md px-4 py-3 text-body text-obsidian
placeholder:text-ash focus:ring-1 focus:ring-moss/30
```

**Rules:**
- No visible borders at rest. Use background colour shift (bone-warm) for definition.
- Focus state: subtle moss ring at 30% opacity
- Error state: ember ring at 40% opacity + ember micro text below
- No floating labels. Use stacked label above field.
- Label: micro-medium in ash, mb-xs

### Bottom Navigation

**Rules:**
- Background: bone with subtle top shadow
- 4–5 items maximum
- Icons: outline style, 22–24px
- Active state: moss fill, no other colour change
- Inactive: ash colour
- No labels on nav items (icon-only) OR micro labels in ash
- No badges with numbers. If notification needed: 6px moss dot.

### Progress / Habit Indicators

**Rules:**
- Growth shown as organic accumulation (rings filling, dots appearing, opacity increasing)
- No percentage numbers. No progress bars. No streaks with fire emojis.
- Decay shown as: desaturation, opacity reduction (1.0 → 0.3), warmth loss (shift toward ash)
- No red alerts, no alarm states, no shame UI
- Ring/circle metaphor preferred (connection to app name)
- Subtle, slow transitions (700ms minimum for state changes)

---

## Messaging & Copy System

### Push Notification Style

**Tone:** Honest, grounded, warm, adult. Like a thoughtful friend, not an app.

**Rules:**
- No emojis
- No exclamation marks
- Sentence case
- Max 60 characters
- No gamified language ("streak", "score", "level up", "you're on fire")
- No forced positivity ("amazing!", "great job!", "you're crushing it!")

### Habit Messaging Categories

**Reinforcement (when maintaining a habit):**
- "Consistency builds closeness."
- "Small actions change relationships."
- "Showing up changes things."
- "This matters more than you think."
- "Another quiet step forward."

**Decay (when a habit is fading):**
- "Connection fades quietly."
- "It's been a while."
- "Some relationships need tending."
- "This one might be drifting."
- "Time passes differently for friendships."

**Recovery (re-engaging after absence):**
- "Welcome back. No pressure."
- "Starting again is its own kind of strength."
- "The door's still open."
- "It doesn't have to be perfect to matter."
- "One message can shift everything."

**Escalation (increasing urgency):**
- Move from neutral observation → gentle prompt → direct suggestion
- Never guilt. Never shame. Never alarm.
- Escalation = increased directness, not increased volume
- Example progression:
  1. "It's been a few days."
  2. "This connection could use some attention."
  3. "Consider reaching out to [name] today."

**Milestone / Celebration:**
- Understated pride, not confetti
- "30 days of showing up."
- "Something's growing here."
- "Quiet consistency. Real results."
- No animations, no popups, no reward screens

### Notification Tone Rules

- Morning nudges (8–10am): warmer, reflective tone
- Evening nudges (6–8pm): action-oriented, gentle
- Weekend: softer, less directive
- Never send notifications with urgency framing
- Maximum 2 notifications per day
- Always respect user-set quiet hours

---

## Habit Visual Language

### Growth States
- Organic progression: rings filling, opacity increasing, warmth deepening
- Slow visual accumulation (never instant)
- Continuity cues: connected dots, flowing lines
- Calm reinforcement: moss tones strengthening

### Decay States
- Subtle fading over time
- Desaturation toward ash
- Warmth loss (moss → ash transition)
- Opacity reduction (1.0 → 0.6 → 0.3)
- No alarms, no red, no shame
- Decay should feel like "forgetting" not "failing"

### Ring Metaphor
- Concentric rings represent relationship depth
- Inner ring = most recent action
- Outer rings = history/consistency
- Gaps in rings = missed periods (no colour, just space)
- Rings use moss (healthy) → ash (fading) colour transition

---

## Layout Principles

- Mobile-first, always (375px base, scale up)
- Maximum content width: 480px on larger screens
- Horizontal padding: 24px
- Sparse density — never more than 3–4 elements visible without scrolling
- Large vertical rhythm between sections (32–48px)
- Negative space is structural, not decorative
- If it feels efficient → wrong direction
- If it feels calm → right direction
- Slow information flow — reveal progressively, don't dump

---

## Iconography

- Style: outline, 1.5px stroke, rounded joins
- Size: 20–24px standard, 28px for navigation emphasis
- Source: Lucide icons (preferred) or custom SVG in same style
- Avoid: Material icons, sharp/angular icons, filled icons, playful/illustrated icons
- Colour: obsidian (active), ash (inactive), moss (selected/positive), ember (alert)

---

## Dark Mode (Future)

When implementing dark mode:
- Background: obsidian
- Surface: slate
- Primary text: bone
- Secondary text: ash
- Accents remain the same (moss, ember, sun, inkblue)
- Shadows become darker, not lighter
- Maintain the same calm, warm tone

---

## Anti-Patterns — Never Do These

- ❌ Gradient backgrounds or buttons
- ❌ Neon accent colours
- ❌ Bouncy/springy animations
- ❌ Confetti or celebration animations
- ❌ Progress bars with percentages
- ❌ Streak counters with fire emojis
- ❌ Achievement badges or medals
- ❌ Star ratings
- ❌ Leaderboards
- ❌ Social comparison features
- ❌ ALL CAPS text anywhere
- ❌ Exclamation marks in UI copy
- ❌ Emojis in interface elements
- ❌ Dashboard-style dense layouts
- ❌ Bright red error states (use ember at reduced opacity)
- ❌ Toast notifications that pop/bounce in
- ❌ Skeleton loaders that flash (use gentle pulse)
- ❌ Sharp corners (< 8px radius)

---

## Summary

Every design decision in Ringur should pass this test:

> Does this make the person feel calmer, more grounded, and more supported? Or does it make them feel stimulated, judged, or pressured?

If the answer is the latter, redesign it. Ringur exists to help people show up for the relationships that matter. The interface should get out of the way and let that happen.
