# Ringur (Reach) - Project Context

## Tech Stack
- **Framework**: Next.js 14+ with App Router (not Pages Router)
- **Language**: TypeScript (strict mode)
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **Mobile**: Capacitor (iOS/Android wrapper)
- **Styling**: Tailwind CSS with custom theme
- **State**: React hooks + Supabase realtime (no Redux/Zustand)

## Directory Structure
```
reach/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (routes)/     # Page components (page.tsx)
│   │   ├── api/          # API routes (route.ts)
│   │   └── auth/         # Auth flows (callback, update-password)
│   ├── components/       # React components (PascalCase.tsx)
│   ├── lib/              # Utilities
│   │   ├── supabase/     # client.ts, server.ts, middleware.ts
│   │   ├── capacitor.ts  # Mobile detection + re-exports
│   │   ├── theme.tsx     # ThemeProvider context + useTheme hook
│   │   ├── ringCalculations.ts  # Ring fill/opacity algorithm
│   │   ├── notifications.ts
│   │   ├── contacts.ts
│   │   └── intents.ts    # Call/text/email actions
│   └── types/            # TypeScript types
│       ├── database.ts   # Supabase generated types
│       └── habitEngine.ts
├── supabase/
│   ├── schema.sql        # Master schema (source of truth)
│   └── migrations/       # Numbered migrations (001_, 002_, etc.)
├── android/              # Capacitor Android project
└── capacitor.config.ts
```

## Supabase Patterns

### Client-Side (Browser/Mobile)
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Query with types
const { data, error } = await supabase
  .from('connections')
  .select('*')
  .eq('user_id', userId)
```

### Server-Side (API Routes, Server Components)
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

### Database Types
- Types are in `src/types/database.ts`
- Update types when schema changes: `Row`, `Insert`, `Update` for each table

### Key Tables
- `users` - User profiles (extends auth.users)
- `connections` - People the user tracks (includes `preferred_contact_method`)
- `interactions` - Logged touchpoints (includes `mood`, `action_type_v2`, `action_weight_v2`)
- `user_settings` - Preferences (includes `theme_preference`: light/dark/system)
- `communication_intents` - Tracked outreach attempts
- `daily_actions` - Habit engine daily action log
- `feature_flags` - Rollout control

## Component Patterns

### Client Components
```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
```

### Modals
- Use backdrop blur + centered content
- Close on backdrop click or X button
- Lock scroll when open (`useScrollLock` hook)

### Design System V2 (Current)
**Complete documentation:** See `ringur-design-system-v2.md` for full specification.

**Color Tokens** (defined in `tailwind.config.ts`):
- Canvas: `bg-bone` (#F6F5F3), `bg-bone-warm` (#ECEAE6)
- Cards/surfaces: `bg-white` on bone canvas
- Text hierarchy: `text-obsidian` (primary), `text-text-secondary` (#4A4D55), `text-text-tertiary` (#6B6E76), `text-text-placeholder` (#9B9DA3)
- Primary action: `bg-moss` (#5F7A6A)
- Accent/high-contrast CTA: `bg-terracotta` (#B5543A) — use sparingly (1-2/screen)
- Supporting colors: `inkblue` (#2F4C5F), `sun` (#E3B873), `ember` (#C46A4A), `slate` (#2A2F3A)
- Light surfaces: `moss-light` (#EEF2EF), `inkblue-light` (#ECF0F3), `terracotta-light` (#F5EEEB) for nudge cards

**Dark Mode — "Deep Night" Theme** (added Feb 2026):
- Enabled via Tailwind `darkMode: 'class'` — `dark` class toggled on `<html>`
- Dark tokens in `tailwind.config.ts` under `colors.dark.*`:
  - Surfaces: `dark-bg` (#0C0D10), `dark-surface` (#161821), `dark-surface-raised` (#1E2029), `dark-surface-hover` (#252731)
  - Text: `dark-text-primary` (#E8E6E2), `dark-text-secondary` (#A3A5AB), `dark-text-tertiary` (#6E7078)
  - Accents: `dark-moss` (#6E9A7E), `dark-inkblue` (#4A7A96), `dark-terracotta` (#D4694E), `dark-sun` (#E8C07A)
  - Subtle BGs: `dark-moss-subtle`, `dark-inkblue-subtle`, `dark-terracotta-subtle` (rgba with low alpha)
  - Border: `dark-border` (rgba(255,255,255,0.06))
- **ThemeProvider**: `src/lib/theme.tsx` — React context with `useTheme()` hook
  - Returns `{ preference, resolvedTheme, setPreference }`
  - Detects system preference via `matchMedia('prefers-color-scheme: dark')`
  - Persists to `user_settings.theme_preference` column in Supabase
  - Wrapped in `src/components/Providers.tsx` (in layout.tsx)
- **Anti-FOUC**: Inline `<script>` in `layout.tsx` checks localStorage before first paint
- **Settings toggle**: Appearance section in Settings (Light/System/Dark buttons)
- **Pattern**: Every light-mode color class gets a `dark:` variant:
  ```
  bg-bone dark:bg-dark-bg
  bg-white dark:bg-dark-surface
  bg-bone-warm dark:bg-dark-surface-raised
  text-obsidian dark:text-dark-text-primary
  text-text-secondary dark:text-dark-text-secondary
  text-text-tertiary dark:text-dark-text-tertiary
  text-moss dark:text-dark-moss
  text-ember dark:text-dark-terracotta
  bg-obsidian/40 dark:bg-black/60  (modal backdrops)
  border-bone-warm dark:border-dark-border
  ```

**Common Patterns:**
```typescript
// Primary button
bg-moss hover:opacity-90 text-bone rounded-md

// Accent button (key CTAs only)
bg-terracotta hover:opacity-90 text-bone rounded-md

// Secondary button
bg-bone-warm dark:bg-dark-surface-raised hover:opacity-80 text-obsidian dark:text-dark-text-primary rounded-md

// Cards
bg-white dark:bg-dark-surface rounded-lg shadow-card p-6

// Nudge cards (escalation/prompts)
bg-moss-light dark:bg-dark-moss-subtle border-l-[2.5px] border-moss/40 dark:border-dark-border rounded-xl p-4

// Focus rings
focus:outline-none focus:ring-2 focus:ring-moss/40

// Section headers (key sections)
text-micro-medium text-inkblue dark:text-dark-inkblue

// Input labels
text-micro-medium text-text-tertiary dark:text-dark-text-tertiary

// Input fields
bg-bone-warm dark:bg-dark-surface-raised text-obsidian dark:text-dark-text-primary

// Modal backdrops
bg-obsidian/40 dark:bg-black/60 backdrop-blur-sm

// Toggle switches (off state)
bg-bone-warm dark:bg-dark-surface-raised
// Toggle thumb
bg-bone dark:bg-dark-text-primary
```

**Connection Ring Component:**
- `<ConnectionRing name={string} strength={RelationshipStrength} daysSinceAction={number} decayStartedAt={string|null} size={72|120} onClick?={() => void} />`
- Dual SVG rings: outer (depth/strength) + inner (recency/health)
- Ring fill + opacity dynamically calculated from strength tier AND days since last contact
- Recency boost: +10% fill and +0.2 opacity for contacts within 0-7 days
- Pulse animation when decaying (3+ days since action)
- Center initials on bone-warm background
- Used in ConnectionCard (72px) and ConnectionDetailModal (120px)
- Click opens `RingStatusModal` with status explanation
- Ring calculation logic in `src/lib/ringCalculations.ts`

**Bottom safe area:** `pb-safe` (custom utility — ensures min 2rem + env(safe-area-inset-bottom))

**Migration Notes (Feb 2026):**
- V1 → V2 migration completed Feb 2026
- Deprecated `ash` (#A6A8AD) — failed WCAG AA on bone backgrounds
- Replaced with semantic text hierarchy: `text-text-secondary` (#4A4D55), `text-text-tertiary` (#6B6E76), `text-text-placeholder` (#9B9DA3)
- Card backgrounds changed from `bg-bone` → `bg-white` on bone canvas
- Added terracotta accent color for high-contrast CTAs
- Connection ring visualization added with dual SVG rings + recency-based dynamics
- Dark mode ("Deep Night") added with full component coverage
- Legacy colors (lavender, tea-green, muted-teal) retained for forest page only

### Safe Area / Android Nav Bar
All page content containers use `pb-safe` to prevent content from being hidden behind Android
software navigation buttons. Defined in `globals.css`:
```css
.pb-safe { padding-bottom: max(2rem, env(safe-area-inset-bottom, 0px)); }
```

## Capacitor (Mobile) Patterns

### Check if running in native app
```typescript
import { isCapacitor } from '@/lib/capacitor'
if (isCapacitor()) {
  // Native-only code
}
```

### Contact Picker
```typescript
import { pickContact } from '@/lib/capacitor'
const contact = await pickContact() // Returns { name, phone, email }
```

### Intents (Call/Text/Email)
```typescript
import { initiateCall, initiateText, initiateEmail } from '@/lib/capacitor'
await initiateText(phoneNumber) // Opens SMS app
```

### Auth Redirects
- Web: `window.location.origin + '/auth/callback/'`
- Mobile: `com.dangur.ringur://auth/callback`
- Use `getAuthRedirectUrl()` helper

### OAuth (Google Sign-In)
OAuth uses **implicit flow** (not PKCE) because `@supabase/ssr`'s `createBrowserClient` forces
PKCE and the code_verifier cookie gets lost during OAuth redirects.

**How it works:**
- `src/lib/oauth.ts` uses `createClient` from `@supabase/supabase-js` directly (NOT `@supabase/ssr`)
  with `flowType: 'implicit'` so Supabase returns `#access_token=...` hash tokens instead of `?code=`
- `src/app/auth/callback/page.tsx` is a client-side page that handles both hash tokens and PKCE codes
- `DeepLinkHandler` routes Capacitor deep links to the callback page

**IMPORTANT:** Do NOT use `createClient` from `@/lib/supabase/client` for OAuth initiation.
That client uses `@supabase/ssr` which forces PKCE and breaks the flow.

## Interaction Types (Habit Engine V1)

The app uses 3 unified interaction types across all surfaces:

| Type | Label | Icon | Legacy Type | Weight |
|------|-------|------|-------------|--------|
| `text` | Message | 💬 | `text` | 1 |
| `call` | Call | 📞 | `call` | 3 |
| `in_person_1on1` | In-person | 🤝 | `in_person` | 6 |

- **Weights are integers** (no decimals)
- Valid day threshold: weight >= 1
- Types defined in `src/types/habitEngine.ts` (`ActionTypeV2`)
- Legacy `InteractionType` (`text|call|in_person|other`) kept for backwards compat
- Old interactions with `other`/removed types still display in history
- Mood tracking: optional `mood` column (`happy|neutral|sad|null`) on interactions

### Key Components
- **ConnectionRing**: Dual SVG rings around initials avatar, fill/opacity driven by strength + recency
- **RingStatusModal**: Click-to-open explanation of ring status with "How rings work" explainer
- **ConnectionCard**: Shows ConnectionRing (72px) on left, connection info on right
- **ConnectionDetailModal**: Shows ConnectionRing (120px) in header, 3-button type picker in edit form
- **DailyProgressIndicator**: Ring progress + "Connected" badge with tick when valid day
- **LogInteractionModal**: 3-button type grid + mood emojis + optional note
- **CatchupMethodModal**: Shows last interaction note, highlights preferred contact method. **Notification taps open this directly** (not ConnectionDetailModal)
- **Add/Edit Connection**: Preferred messaging app selector (Text/WhatsApp/Email)
- **EscalationNudge**: Moss-light background with left border accent (nudge card pattern)
- **PendingCatchupPrompt**: Terracotta-light background with left border accent (nudge card pattern)
- **Providers**: Client wrapper in layout.tsx, provides ThemeProvider context to the app

## Feature Flags

### Check flag status
```typescript
const { data } = await supabase
  .from('feature_flags')
  .select('is_enabled, rollout_percentage')
  .eq('id', 'flag_name')
  .single()
```

### Common flags
- `habit_engine_v1` - Main habit engine (permanently enabled)
- `onboarding_v2` - New onboarding flow

## Database Migrations

### Creating migrations
1. Create `supabase/migrations/XXX_description.sql`
2. Use `IF NOT EXISTS` for safety
3. Update `schema.sql` to match
4. Update `src/types/database.ts`

### Migration template
```sql
-- Description of changes

-- Add column
ALTER TABLE public.table_name
ADD COLUMN IF NOT EXISTS column_name TYPE;

-- Backfill existing rows
UPDATE public.table_name
SET column_name = default_value
WHERE column_name IS NULL;
```

## Auth Flow

### Login
- Email/password OR Google OAuth
- OAuth uses implicit flow (see "OAuth" section under Capacitor Patterns)
- Session stored in cookies via SSR middleware (web) or client-side (Capacitor)

### Middleware (Web Only)
- `middleware.ts` provides server-side auth redirects on Vercel (unauthenticated → `/login`)
- Also redirects logged-in users away from `/login` → `/`
- Allows through: `/login`, `/auth/*`, `/onboarding`
- **Excluded from Capacitor builds**: pre/post build scripts in `package.json` rename
  `middleware.ts` → `middleware.ts.bak` during static export (same pattern as `route.ts`)

### Password Reset
The update-password page handles TWO different flows because Supabase behaves differently
depending on the redirect URL scheme:

**Web (hash tokens):**
1. User requests reset → `redirectTo: /auth/update-password/`
2. Supabase redirects to `/auth/update-password/#access_token=...&type=recovery`
3. Page reads tokens from URL hash and calls `setSession()`

**Mobile/Capacitor (PKCE codes):**
1. User requests reset → `redirectTo: com.dangur.ringur://auth/update-password/`
2. Supabase sends PKCE code: `com.dangur.ringur://auth/update-password/?code=xxx`
3. DeepLinkHandler routes to `/auth/update-password/?code=xxx`
4. Page detects `?code` param and calls `exchangeCodeForSession(code)` client-side

**KEY INSIGHT**: Supabase uses hash tokens for standard HTTPS redirects but PKCE codes
for custom URL schemes (`com.dangur.ringur://`). The update-password page must handle both.
The PKCE code exchange happens client-side (not via the server callback route) because
Capacitor uses static export with no server-side routes.

**IMPORTANT**: Redirect URLs MUST have trailing slashes (e.g., `/auth/update-password/`) because
`next.config.mjs` has `trailingSlash: true`.

### Supabase Dashboard Configuration
These URLs MUST be whitelisted in:
**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Required URLs:
- `https://ringur.dan-gur.com/auth/update-password/` (web password reset)
- `https://ringur.dan-gur.com/auth/callback/` (web OAuth login)
- `com.dangur.ringur://auth/callback` (mobile OAuth - NO trailing slash)
- `com.dangur.ringur://auth/update-password/` (mobile password reset)

## Deployment

### Web (Vercel)
Push to `main` branch - Vercel auto-deploys to `ringur.dan-gur.com`

### Android (Capacitor)
Capacitor requires a **static export** - it can't use Next.js server features.

```bash
# 1. Build static export (uses prebuild:capacitor to rename middleware.ts)
npm run build:capacitor

# 2. Sync to Android project
npx cap sync android

# 3. Build APK via Gradle CLI or Android Studio
# Option A - CLI:
cd android && ./gradlew assembleDebug
# Option B - Android Studio:
npx cap open android
# Then: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Why static export?**
- Capacitor serves files from the device filesystem, not a server
- `next.config.mjs` conditionally enables `output: 'export'` when `STATIC_EXPORT=true`
- The `webDir: 'out'` in `capacitor.config.ts` points to the export directory

**Limitations of static export:**
- No API routes (`/api/*`) - use Supabase directly from client
- No server components - all pages must be client components
- No middleware - auth checks happen client-side
- No server route at `/auth/callback` - OAuth code exchange happens client-side in `DeepLinkHandler`

**Build scripts handle incompatible files** by temporarily renaming them during Capacitor builds:
- `middleware.ts` → `middleware.ts.bak`
See `prebuild:capacitor` / `postbuild:capacitor` in `package.json`.

Note: `/auth/callback` is now a client-side `page.tsx` (not a server `route.ts`), so it works
in both web and static export without any build script workarounds.

### Android Gradle - Windows File Locking Fix
Gradle builds on Windows fail with "Unable to delete directory" errors when Capacitor plugin
build output is inside `node_modules/`. This is caused by Windows services (Search Indexer,
cloud sync) locking files in the `Documents` folder.

**Fix:** `android/build.gradle` contains a `subprojects` block that redirects any subproject
whose source is in `node_modules/` to build inside `android/build/node_modules_builds/` instead:
```groovy
subprojects { subproject ->
    if (subproject.projectDir.absolutePath.contains('node_modules')) {
        subproject.buildDir = new File(rootProject.buildDir, "node_modules_builds/${subproject.name}")
    }
}
```

**Also note:** `android/gradle.properties` has `org.gradle.daemon=true` — the persistent daemon
manages file handles properly and avoids race conditions on Windows.

## Testing Checklist
Before submitting changes:
- [ ] `npm run build` passes (web)
- [ ] `STATIC_EXPORT=true npm run build` passes (mobile)
- [ ] No TypeScript errors
- [ ] Test on web and mobile (Capacitor)
- [ ] Database types updated if schema changed

## Onboarding Flow
5-step flow in `src/app/onboarding/page.tsx`:
1. Welcome
2. Philosophy
3. Expectations
4. **Add Connections** — Opens `AddConnectionModal` (saves directly to DB). Max 3. Skip allowed.
5. **Take First Action** — Per-connection "Plan" (`PlanCatchupModal`) and "Catch-up" (`CatchupMethodModal`) buttons. Skip or Complete Setup finishes onboarding.

Connections are saved to DB in step 4 (not batched). Step 5 fetches them from DB.

## Common Tasks

### Add a new page
1. Create `src/app/route-name/page.tsx`
2. Add `'use client'` if using hooks/interactivity
3. Wrap with auth check if protected

### Add a database column
1. Create migration in `supabase/migrations/`
2. Update `supabase/schema.sql`
3. Update `src/types/database.ts`

### Add a modal component
1. Create `src/components/ModalName.tsx`
2. Use existing modal patterns (AddConnectionModal as reference)
3. Import and add state in parent component
