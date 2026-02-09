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

### Styling Classes
```
Primary button: bg-muted-teal-500 hover:bg-muted-teal-600 text-white rounded-xl
Secondary button: bg-lavender-100 text-lavender-700 rounded-xl
Background: bg-lavender-50
Cards: bg-white rounded-2xl shadow-sm border border-lavender-100
Text: text-lavender-800 (primary), text-lavender-500 (secondary)
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
- **LogInteractionModal**: 3-button type grid + mood emojis + optional note
- **CatchupMethodModal**: Shows last interaction note, highlights preferred contact method
- **ConnectionDetailModal**: 3-button type picker in edit form
- **Add/Edit Connection**: Preferred messaging app selector (Text/WhatsApp/Email)

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
