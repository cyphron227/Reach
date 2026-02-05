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
- `connections` - People the user tracks
- `interactions` - Logged touchpoints
- `pending_intents` - Planned actions
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
- Web: `window.location.origin + '/auth/callback'`
- Mobile: `com.dangur.ringur://auth/callback`
- Use `getAuthRedirectUrl()` helper

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
- PKCE flow with code exchange
- Session stored in cookies via SSR middleware

### Password Reset (Hash Token Flow)
1. User requests reset via `resetPasswordForEmail()` with `redirectTo: /auth/update-password/`
2. Supabase sends email with verification link
3. User clicks link, Supabase redirects to `/auth/update-password/#access_token=...&type=recovery`
4. Page reads tokens from URL hash and calls `setSession()`
5. User enters new password

This is simpler than the PKCE callback flow and works reliably.

**IMPORTANT**: Redirect URLs MUST have trailing slashes (e.g., `/auth/update-password/`) because
`next.config.mjs` has `trailingSlash: true`.

### Supabase Dashboard Configuration
These URLs MUST be whitelisted in:
**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Required URLs:
- `https://ringur.dan-gur.com/auth/update-password/` (password reset)
- `https://ringur.dan-gur.com/auth/callback/` (OAuth login)
- `com.dangur.ringur://auth/callback` (mobile app - NO trailing slash)

## Deployment

### Web (Vercel)
Push to `main` branch - Vercel auto-deploys to `ringur.dan-gur.com`

### Android (Capacitor)
Capacitor requires a **static export** - it can't use Next.js server features.

```bash
# 1. Build static export (outputs to /out directory)
STATIC_EXPORT=true npm run build

# 2. Sync to Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. Build APK/AAB from Android Studio
```

**Why static export?**
- Capacitor serves files from the device filesystem, not a server
- `next.config.mjs` conditionally enables `output: 'export'` when `STATIC_EXPORT=true`
- The `webDir: 'out'` in `capacitor.config.ts` points to the export directory

**Limitations of static export:**
- No API routes (`/api/*`) - use Supabase directly from client
- No server components - all pages must be client components
- No middleware - auth checks happen client-side

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
