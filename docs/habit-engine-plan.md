# Ringur Habit Engine v1 - Non-Destructive Migration Plan

## Executive Summary

This plan implements the "Habit Engine v1" vision while ensuring **all changes are reversible** and won't break the existing Supabase schema. The approach uses additive-only database changes, feature flags, and parallel data structures.

---

## Current Architecture (What Exists)

### Database Tables
| Table | Purpose |
|-------|---------|
| `connections` | People to maintain (name, frequency, last_interaction_date) |
| `interactions` | Logged catch-ups (type: call/text/in_person/other, memory, date) |
| `user_streaks` | Global daily streak tracking |
| `connection_streaks` | Per-contact cycle tracking (already has `worst_health_reached`, `was_ever_wilting`) |
| `weekly_reflections` | Weekly reflection prompts |
| `achievement_definitions` | Achievement catalog |

### Existing Features That Map to New Vision
- **Daily streak** -> Becomes "valid day" streak (needs weight-based calculation)
- **Forest health** (thriving/healthy/needs_water/wilting) -> Becomes 5-tier strength model
- **Interaction types** (call/text/in_person/other) -> Becomes weighted action types
- **Weekly reflection** -> Becomes pattern review

---

## New Vision Requirements

### 1. Weighted Daily Actions
| Action | Weight |
|--------|--------|
| Self-reflection | 0.5 |
| Text | 1.0 |
| Social planning | 2.0 |
| Call | 3.0 |
| Group activity | 4.0 |
| In-person 1:1 | 6.0 |

### 2. Relationship Strength States (5-tier)
`Flourishing -> Strong -> Stable -> Thinning -> Decaying`

Decay thresholds: 3 days (thinning signal) -> 7 days (weakening) -> 14 days (erosion) -> 30 days (decay)

### 3. Ring Structure
- **Core ring**: 0-7 people max (inner circle)
- **Outer circle**: Unlimited weak ties

### 4. Escalation Ladder
Text -> Call -> In-person (nudge upward, never block)

### 5. Replacement Mechanism
After 30+ days in decay: Reinvest | Downgrade | Replace | Archive

---

## Non-Destructive Implementation

### Principle: Add, Don't Modify

All changes follow these rules:
1. **New tables** instead of altering existing ones
2. **New columns with `_v2` suffix** on existing tables
3. **Feature flags** to toggle between old/new behavior
4. **Parallel data** - new system writes to both old and new structures

---

## Phase 1: Database Migration (Reversible)

### New File: `supabase/migrations/006_habit_engine_v1.sql`

#### New Enum Types
```sql
CREATE TYPE action_type AS ENUM ('self_reflection', 'text', 'social_planning', 'call', 'group_activity', 'in_person_1on1');
CREATE TYPE relationship_strength AS ENUM ('flourishing', 'strong', 'stable', 'thinning', 'decaying');
CREATE TYPE ring_tier AS ENUM ('core', 'outer');
CREATE TYPE connection_lifecycle AS ENUM ('active', 'pending_action', 'archived');
```

#### New Tables

**`daily_actions`** - Tracks weighted daily habit actions
- `id`, `user_id`, `connection_id` (nullable for self-reflection)
- `action_type`, `action_weight`, `action_date`, `notes`
- `legacy_interaction_id` (links to old interactions table)

**`daily_habit_log`** - Aggregated daily score per user
- `user_id`, `log_date`, `total_weight`, `action_count`
- `is_valid_day` (computed: total_weight >= 0.5)

**`connection_health_v2`** - New relationship strength tracking
- `connection_id`, `ring_tier`, `ring_position` (1-7 for core)
- `current_strength`, `previous_strength`, `strength_changed_at`
- `days_since_action`, `decay_started_at`
- `lifecycle_state`, `pending_action_since`
- `last_nudge_level`, `last_nudge_at`

**`weekly_pattern_reviews`** - Meaning-focused weekly summaries
- `week_start_date`, `patterns` (JSONB: depth_score, variety_score, insight_type)
- `primary_insight`, `suggested_actions`
- `legacy_reflection_id` (links to old weekly_reflections)

**`feature_flags`** - For gradual rollout
- `id`, `is_enabled`, `enabled_for_users[]`, `rollout_percentage`

#### Additive Columns (existing tables)
```sql
-- connections table
ADD COLUMN ring_tier_v2 ring_tier DEFAULT 'outer'
ADD COLUMN ring_position_v2 integer
ADD COLUMN lifecycle_state_v2 connection_lifecycle DEFAULT 'active'

-- interactions table
ADD COLUMN action_type_v2 action_type
ADD COLUMN action_weight_v2 decimal(3,1)

-- user_streaks table
ADD COLUMN valid_days_streak_v2 integer DEFAULT 0
ADD COLUMN longest_valid_days_v2 integer DEFAULT 0
```

#### Rollback SQL (Full Revert)
```sql
DROP TABLE IF EXISTS weekly_pattern_reviews, connection_health_v2, daily_habit_log, daily_actions, feature_flags CASCADE;
ALTER TABLE connections DROP COLUMN IF EXISTS ring_tier_v2, ring_position_v2, lifecycle_state_v2;
ALTER TABLE interactions DROP COLUMN IF EXISTS action_type_v2, action_weight_v2;
ALTER TABLE user_streaks DROP COLUMN IF EXISTS valid_days_streak_v2, longest_valid_days_v2;
DROP TYPE IF EXISTS action_type, relationship_strength, ring_tier, connection_lifecycle CASCADE;
```

---

## Phase 2: TypeScript Types

### New File: `src/types/habitEngine.ts`

```typescript
export type ActionTypeV2 = 'self_reflection' | 'text' | 'social_planning' | 'call' | 'group_activity' | 'in_person_1on1';

export const ACTION_WEIGHTS: Record<ActionTypeV2, number> = {
  self_reflection: 0.5, text: 1.0, social_planning: 2.0,
  call: 3.0, group_activity: 4.0, in_person_1on1: 6.0,
};

export type RelationshipStrength = 'flourishing' | 'strong' | 'stable' | 'thinning' | 'decaying';
export type RingTier = 'core' | 'outer';
export const CORE_RING_MAX = 7;

export const DECAY_THRESHOLDS = {
  thinning_signal: 3, weakening: 7, erosion: 14, decay_state: 30,
};
```

---

## Phase 3: Feature Flags

| Flag | Purpose | Default |
|------|---------|---------|
| `habit_engine_v1` | Master switch | OFF |
| `relationship_strength_v2` | 5-tier strength model | OFF |
| `ring_structure` | Core/Outer ring UI | OFF |
| `escalation_ladder` | Escalation nudges | OFF |
| `weekly_pattern_reviews` | New weekly format | OFF |
| `replacement_mechanism` | 30-day decay flow | OFF |

---

## Phase 4: UI Changes (Behind Flags)

### Modified Files

| File | Change |
|------|--------|
| `src/components/LogInteractionModal.tsx` | Add action type picker with weights (when flag ON) |
| `src/app/forest/page.tsx` | Show 5-tier strength, ring grouping (when flag ON) |
| `src/app/reflect/page.tsx` | Pattern review flow (when flag ON) |
| `src/app/page.tsx` | Daily progress indicator, valid day status |
| `src/components/ConnectionCard.tsx` | Strength badge, escalation nudge |

### New Components

| Component | Purpose |
|-----------|---------|
| `DailyProgressIndicator.tsx` | Shows daily weight progress toward valid day |
| `ActionTypePicker.tsx` | Weighted action selection UI |
| `RelationshipStrengthBadge.tsx` | 5-tier strength visualization |
| `EscalationNudge.tsx` | "Try calling instead" suggestions |
| `RingSelector.tsx` | Core/Outer ring assignment |
| `ReplacementFlow.tsx` | 30-day decay replacement modal |

---

## Phase 5: Utility Functions

### New File: `src/lib/habitEngineUtils.ts`

Key functions:
- `mapLegacyInteractionType()` - Convert old types to new weighted types
- `getActionWeight()` - Return weight for action type
- `isValidDay()` - Check if total_weight >= 0.5
- `calculateRelationshipStrength()` - Decay logic based on days since action
- `getEscalationNudge()` - Suggest next escalation level
- `analyzeWeeklyPattern()` - Generate depth/variety/consistency scores
- `isFeatureEnabled()` - Check feature flag for user

---

## Phase 6: Data Migration (Optional)

### Backfill Script (Run Once)
```sql
-- Create connection_health_v2 records from existing connections
INSERT INTO connection_health_v2 (connection_id, user_id, ring_tier, current_strength, days_since_action, last_action_date)
SELECT
  c.id, c.user_id, 'outer',
  CASE
    WHEN (CURRENT_DATE - c.last_interaction_date) <= 3 THEN 'flourishing'
    WHEN (CURRENT_DATE - c.last_interaction_date) <= 7 THEN 'strong'
    WHEN (CURRENT_DATE - c.last_interaction_date) <= 14 THEN 'stable'
    WHEN (CURRENT_DATE - c.last_interaction_date) <= 30 THEN 'thinning'
    ELSE 'decaying'
  END,
  COALESCE(CURRENT_DATE - c.last_interaction_date, 0),
  c.last_interaction_date
FROM connections c
ON CONFLICT (connection_id) DO NOTHING;
```

---

## Rollout Strategy

| Week | Action |
|------|--------|
| 1-2 | Deploy schema + flags OFF. Internal testing with `enabled_for_users` |
| 3-4 | 10% rollout (`rollout_percentage: 10`) |
| 5-6 | 50% rollout |
| 7+ | 100% rollout (`is_enabled: true`) |

---

## Rollback Procedures

### Quick Rollback (Feature-Level)
Set all feature flags to `is_enabled: false`. UI reverts to v1 behavior instantly.

### Full Rollback (Schema-Level)
Run the rollback SQL in Phase 1. All v2 data is dropped, v1 continues working.

### Partial Rollback
Individual features can be disabled independently via their flags.

---

## Files to Create/Modify

### New Files
- `supabase/migrations/006_habit_engine_v1.sql` - Schema changes
- `src/types/habitEngine.ts` - TypeScript types
- `src/lib/habitEngineUtils.ts` - Utility functions
- `src/lib/featureFlags.ts` - Flag checking
- `src/components/DailyProgressIndicator.tsx`
- `src/components/ActionTypePicker.tsx`
- `src/components/RelationshipStrengthBadge.tsx`
- `src/components/EscalationNudge.tsx`
- `src/components/RingSelector.tsx`
- `src/components/ReplacementFlow.tsx`
- `src/app/reflect/pattern-review/page.tsx`

### Modified Files
- `src/types/database.ts` - Import new types
- `src/lib/streakUtils.ts` - Add v2 streak functions
- `src/components/LogInteractionModal.tsx` - Conditional action picker
- `src/app/forest/page.tsx` - Conditional 5-tier strength
- `src/app/reflect/page.tsx` - Conditional pattern review
- `src/app/page.tsx` - Daily progress indicator
- `src/components/ConnectionCard.tsx` - Strength badge

---

## Verification Checklist

### After Schema Migration
- [ ] All new tables exist in Supabase
- [ ] RLS policies active on all new tables
- [ ] Feature flags table seeded with defaults OFF
- [ ] Existing app continues working unchanged

### After UI Deployment
- [ ] With flags OFF: app behaves identically to before
- [ ] Enable flags for test user
- [ ] Log action -> weight calculated correctly
- [ ] Daily valid day indicator updates
- [ ] Connection strength reflects decay logic
- [ ] Weekly pattern review generates insights
- [ ] Escalation nudges appear appropriately

### Rollback Test
- [ ] Disable all flags -> app reverts to v1
- [ ] Run rollback SQL -> schema clean
- [ ] App continues working on v1 schema

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Schema migration fails | All changes are additive; existing tables untouched |
| Data inconsistency between v1/v2 | Dual-write: log to both old and new tables |
| Feature flags fail to load | Default to v1 behavior (flags OFF) |
| Performance impact | New tables indexed; lazy-load v2 data |
| User confusion during rollout | Gradual rollout; clear UI differences |

---

## What's NOT Included (Explicitly Deprioritized per Vision)

- Achievements/badges beyond existing
- Points/gamification
- Leaderboards
- Social sharing
- Viral mechanics
