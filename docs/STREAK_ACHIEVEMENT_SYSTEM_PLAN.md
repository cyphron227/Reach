# Streak & Achievement System - Refined Plan

## Executive Summary

This document evaluates, refines, and provides an implementation plan for the Streak & Achievement System in Reach. The plan builds on existing infrastructure (weekly reflection streaks, forest health system) while introducing new gamification features that drive daily engagement.

---

## Part 1: Requirements Evaluation

### What Already Exists

| Feature | Status | Notes |
|---------|--------|-------|
| Weekly reflection streaks | ✅ Implemented | `calculateReflectionStreak()` in reflectionUtils.ts |
| Forest health visualization | ✅ Implemented | 4-level health system (thriving/healthy/needs_water/wilting) |
| Tree growth stages | ✅ Implemented | 6 stages from seed to ancient |
| Interaction type tracking | ✅ Implemented | call, text, in_person, other |
| Frequency settings | ✅ Implemented | weekly, biweekly, monthly, quarterly, biannually |
| Last memory storage | ✅ Implemented | Memory text on interactions table |
| Daily connection streaks | ❌ Missing | Core feature to build |
| Achievement badges | ❌ Missing | Core feature to build |
| Monthly summary page | ❌ Missing | New feature |
| Streak freeze functionality | ❌ Missing | New feature |

### Alignment with Existing Patterns

**Strong Alignment:**
- Forest/tree metaphor extends naturally to achievements
- Health calculation logic can be reused for streak validation
- Modal system supports achievement unlock notifications
- Color system (tea-green for success) perfect for celebrations

**Needs Adaptation:**
- Current streak is weekly (reflections), new streak is daily (interactions)
- No per-connection achievement tracking currently exists
- Monthly summary requires aggregation queries not currently built

---

## Part 2: Refined Requirements

### 2.1 Daily Connection Streak (Primary Feature)

**Refined Mechanic:**
```
User maintains streak by logging at least ONE interaction with ANY contact per day
```

**Why refined this way:**
- Original spec is correct - any connection counts
- Keeps barrier low (achievable daily) while driving engagement
- Aligns with app's philosophy: nurturing relationships broadly, not obsessively

**Streak Display Location:**
- Home screen header (primary)
- Forest page summary (secondary)
- Monthly report (detailed)

**Recommended Milestones (Streamlined):**

| Days | Badge Name | Icon | Rationale |
|------|-----------|------|-----------|
| 7 | Week Warrior | 🔥 | First meaningful achievement |
| 30 | Monthly Maintainer | 🌟 | Habit formation milestone |
| 90 | Quarterly Connector | 💪 | Serious commitment |
| 180 | Half-Year Hero | 🏆 | Exceptional dedication |
| 365 | Year-Round Friend | 👑 | Elite status |

**Removed from original:** "Weekly summary: 7 days, 12 connections" - this belongs in monthly summary, not cluttering streak display.

### 2.2 Streak Protection (Refined)

**Original:** 2 streak freezes per week

**Refined Recommendation:**

| Protection | Mechanism | Rationale |
|------------|-----------|-----------|
| Auto-freeze | 1 free "life" per week, auto-applied | Reduces friction, no action needed |
| Weekend flex | Fri-Sun counts as single 3-day window | Weekends are naturally social, or recovery time |
| Catch-up grace | 24-hour grace period before streak breaks | Time zones, busy days |

**Implementation Note:** Track `streak_freezes_used_this_week` on a rolling 7-day window, not calendar week.

**Removed:** "2 interactions on Saturday can count for Sat + Sun" - too complex to explain, weekend flexibility achieves same goal more simply.

### 2.3 Per-Contact Achievement Badges (Refined)

**Consistency Badges (Per-Contact):**

| Badge | Criteria | Icon |
|-------|----------|------|
| On Track | Met frequency for 3 consecutive cycles | 🎯 |
| Rhythm Master | Met frequency for 6 consecutive cycles | 🎵 |
| Unbreakable Bond | Met frequency for 12 consecutive cycles | 💎 |

**Cycle Definition:**
- Weekly contact: 1 cycle = 1 week
- Monthly contact: 1 cycle = 1 month
- Etc.

**Recovery Badges (Global):**

| Badge | Criteria | Icon |
|-------|----------|------|
| Second Chance | Restored 1 "wilting" contact to "healthy" | 🌱 |
| Phoenix Rising | Restored 3 "wilting" contacts in 30 days | 🔥 |
| Forest Healer | Brought forest health from <50% to >80% | 🌳 |

**Quality Badges (Global):**

| Badge | Criteria | Icon |
|-------|----------|------|
| Quality Time | 5+ in-person interactions in 30 days | ☕ |
| Deep Listener | 10+ interactions with memory notes in 30 days | 📝 |
| Variety Connector | Used all 4 interaction types in 7 days | 🌈 |

**Removed from original:**
- "Thoughtful Touch" (following up on specific mentions) - requires NLP/AI that's out of scope
- Excessive badge count - focused on meaningful, trackable achievements

### 2.4 Monthly Summary Report (Refined)

**Structure (Streamlined):**

```
┌─────────────────────────────────────────┐
│  YOUR [MONTH] REACH REPORT              │
├─────────────────────────────────────────┤
│  🔥 STREAK STATUS                       │
│  Current: 28 days                       │
│  [Progress bar to 30-day milestone]     │
├─────────────────────────────────────────┤
│  📊 CONNECTION OVERVIEW                 │
│  Total Interactions: 34                 │
│  • In-person: 8  • Call/Video: 12       │
│  • Text: 14                             │
│                                         │
│  Forest Health: 76% → 82% ↗️            │
├─────────────────────────────────────────┤
│  🏆 ACHIEVEMENTS UNLOCKED               │
│  [Badge] [Badge] [Badge]                │
│                                         │
│  ⏳ In Progress:                        │
│  Rhythm Master - 2 more months          │
├─────────────────────────────────────────┤
│  💚 THRIVING (3)  🍂 NEED ATTENTION (2) │
│  Gav ⭐             Guy - never met     │
│  Lisa ✓             Arshad - overdue    │
│  Ben ✓                                  │
├─────────────────────────────────────────┤
│  📈 YOUR PATTERNS                       │
│  Most active: Thursdays                 │
│  Preferred: In-person (59%)             │
│  Balance: Friends 45% | Family 25%      │
├─────────────────────────────────────────┤
│  🎯 SUGGESTED FOCUS FOR [NEXT MONTH]    │
│  • Reach out to Guy                     │
│  • 2 days to 30-day streak!             │
└─────────────────────────────────────────┘
```

**Removed/Simplified from original:**
- Memory highlights section (clutters the summary, memories are in interaction history)
- Social sharing (phase 2 feature, not MVP)
- Download summary card (phase 2)
- Overly detailed trend breakdowns

**Access:**
- Auto-prompt on first open of month
- Accessible from settings/menu anytime
- Push notification: "Your January Reach Report is ready 📊"

---

## Part 3: Database Schema Design

### New Tables Required

```sql
-- 1. User streak tracking
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Daily interaction streak
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_interaction_date DATE,
  streak_started_at DATE,

  -- Weekly streak freeze tracking
  freezes_used_this_week INTEGER NOT NULL DEFAULT 0,
  week_freeze_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 2. Achievement definitions (static reference)
CREATE TABLE achievement_definitions (
  id VARCHAR(50) PRIMARY KEY,  -- e.g., 'week_warrior', 'phoenix_rising'
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(10) NOT NULL,   -- emoji
  category VARCHAR(50) NOT NULL,  -- 'streak', 'consistency', 'recovery', 'quality'
  threshold_value INTEGER,     -- e.g., 7 for 7-day streak
  threshold_type VARCHAR(50),  -- e.g., 'streak_days', 'cycles', 'interactions'
  is_per_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User achievement progress & unlocks
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL REFERENCES achievement_definitions(id),
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,  -- NULL for global achievements

  -- Progress tracking
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, achievement_id, connection_id)
);

-- 4. Connection streak tracking (per-contact cycles)
CREATE TABLE connection_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Consecutive cycles tracking
  current_cycle_streak INTEGER NOT NULL DEFAULT 0,
  longest_cycle_streak INTEGER NOT NULL DEFAULT 0,
  last_cycle_met_at DATE,

  -- Historical health tracking (for recovery badges)
  worst_health_reached VARCHAR(20),  -- 'wilting', 'needs_water', etc.
  was_ever_wilting BOOLEAN DEFAULT FALSE,
  restored_from_wilting_at DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(connection_id)
);

-- 5. Monthly reports (cached for performance)
CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,  -- First day of month

  -- Snapshot data (JSON for flexibility)
  report_data JSONB NOT NULL,

  -- View tracking
  viewed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, report_month)
);

-- Indexes
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);
CREATE INDEX idx_connection_streaks_connection_id ON connection_streaks(connection_id);
CREATE INDEX idx_monthly_reports_user_month ON monthly_reports(user_id, report_month);

-- Triggers for updated_at
CREATE TRIGGER update_user_streaks_updated_at BEFORE UPDATE ON user_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_achievements_updated_at BEFORE UPDATE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connection_streaks_updated_at BEFORE UPDATE ON connection_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Seed Data for Achievement Definitions

```sql
INSERT INTO achievement_definitions (id, name, description, icon, category, threshold_value, threshold_type, is_per_contact) VALUES
-- Streak Achievements
('week_warrior', 'Week Warrior', 'Maintained a 7-day connection streak', '🔥', 'streak', 7, 'streak_days', false),
('monthly_maintainer', 'Monthly Maintainer', 'Maintained a 30-day connection streak', '🌟', 'streak', 30, 'streak_days', false),
('quarterly_connector', 'Quarterly Connector', 'Maintained a 90-day connection streak', '💪', 'streak', 90, 'streak_days', false),
('half_year_hero', 'Half-Year Hero', 'Maintained a 180-day connection streak', '🏆', 'streak', 180, 'streak_days', false),
('year_round_friend', 'Year-Round Friend', 'Maintained a 365-day connection streak', '👑', 'streak', 365, 'streak_days', false),

-- Per-Contact Consistency
('on_track', 'On Track', 'Met your connection frequency for 3 consecutive cycles', '🎯', 'consistency', 3, 'cycles', true),
('rhythm_master', 'Rhythm Master', 'Met your connection frequency for 6 consecutive cycles', '🎵', 'consistency', 6, 'cycles', true),
('unbreakable_bond', 'Unbreakable Bond', 'Met your connection frequency for 12 consecutive cycles', '💎', 'consistency', 12, 'cycles', true),

-- Recovery Achievements
('second_chance', 'Second Chance', 'Restored a wilting connection to healthy', '🌱', 'recovery', 1, 'recoveries', false),
('phoenix_rising', 'Phoenix Rising', 'Restored 3 wilting connections in 30 days', '🔥', 'recovery', 3, 'recoveries_30d', false),
('forest_healer', 'Forest Healer', 'Brought forest health from below 50% to above 80%', '🌳', 'recovery', 1, 'forest_recovery', false),

-- Quality Achievements
('quality_time', 'Quality Time', 'Had 5+ in-person interactions in 30 days', '☕', 'quality', 5, 'in_person_30d', false),
('deep_listener', 'Deep Listener', 'Added memory notes to 10+ interactions in 30 days', '📝', 'quality', 10, 'memories_30d', false),
('variety_connector', 'Variety Connector', 'Used all 4 interaction types in 7 days', '🌈', 'quality', 4, 'types_7d', false);
```

---

## Part 4: Implementation Plan

### Phase 1: Foundation (Week 1-2)
**Goal:** Core streak tracking and display

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Database schema migration | P0 | 2h | Create user_streaks, connection_streaks tables |
| Streak calculation utility | P0 | 4h | `calculateDailyStreak()` in streakUtils.ts |
| Streak update on interaction | P0 | 3h | Hook into `logInteraction` flow |
| Home screen streak display | P0 | 3h | Fire icon + day count in header |
| Streak freeze logic | P1 | 4h | Auto-freeze, weekend flex rules |
| Streak milestone notifications | P1 | 3h | Toast/modal on reaching 7, 30, 90 days |

**Testing Checkpoint:** User can see streak on home, streak increments on log, streak survives one missed day per week.

### Phase 2: Achievements System (Week 2-3)
**Goal:** Achievement framework and initial badges

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Achievement definitions table | P0 | 1h | Schema + seed data |
| User achievements table | P0 | 1h | Track progress + unlocks |
| Achievement evaluation engine | P0 | 6h | Check conditions on interaction log |
| Streak achievements (7/30/90/180/365) | P0 | 3h | Wire up streak milestones |
| Achievement unlock modal | P0 | 3h | Celebration UI on unlock |
| Achievement badge display | P1 | 3h | Show badges on profile/settings |
| Recovery badge tracking | P1 | 4h | Track wilting→healthy transitions |
| Quality badges | P1 | 4h | In-person count, memory notes, variety |

**Testing Checkpoint:** Earning badges triggers celebration modal, badges persist in profile.

### Phase 3: Per-Contact Achievements (Week 3-4)
**Goal:** Connection-level consistency tracking

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Connection cycle tracking | P0 | 4h | Determine if frequency met each cycle |
| On Track badge (3 cycles) | P0 | 2h | Per-contact unlock |
| Rhythm Master badge (6 cycles) | P0 | 2h | Per-contact unlock |
| Unbreakable Bond badge (12 cycles) | P0 | 2h | Per-contact unlock |
| Badge display on ConnectionCard | P1 | 3h | Small badge icons on cards |
| Badge display in Forest view | P1 | 3h | Tree badges/decorations |

**Testing Checkpoint:** Consistent connection earns badges, badges appear on their card.

### Phase 4: Monthly Summary Report (Week 4-5)
**Goal:** Monthly analytics and insights

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Monthly report data aggregation | P0 | 6h | Query interactions, calculate stats |
| Monthly report page UI | P0 | 6h | New route `/report` or `/summary` |
| Report caching (monthly_reports table) | P1 | 3h | Generate once, cache results |
| Auto-prompt on month start | P1 | 3h | Modal or notification on first visit |
| Pattern analysis (day, type breakdowns) | P2 | 4h | Charts/visualizations |
| Push notification for report ready | P2 | 2h | Capacitor notification integration |

**Testing Checkpoint:** User sees monthly summary with accurate stats on first of month.

### Phase 5: Polish & Engagement (Week 5-6)
**Goal:** Refinements and retention features

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Achievement progress indicators | P1 | 3h | "2 more days to Monthly Maintainer" |
| Settings for streak notifications | P1 | 2h | Toggle streak reminders |
| Streak danger warning | P1 | 2h | "Your streak will end in 6 hours!" |
| Historical streak view | P2 | 4h | Calendar heatmap of activity |
| Share achievements (optional) | P2 | 4h | Generate shareable card |

---

## Part 5: Technical Integration Points

### 1. Streak Update Hook
**Location:** After successful interaction save in `LogInteractionModal.tsx`

```typescript
// After saving interaction to database
await updateDailyStreak(userId, interactionDate);
await evaluateAchievements(userId, 'interaction_logged', {
  connectionId,
  interactionType,
  hasMemory: !!memory
});
await updateConnectionCycleStreak(connectionId);
```

### 2. Achievement Evaluation Engine
**New file:** `/src/lib/achievementEngine.ts`

```typescript
interface AchievementContext {
  userId: string;
  event: 'interaction_logged' | 'streak_milestone' | 'health_changed' | 'daily_check';
  data: Record<string, unknown>;
}

async function evaluateAchievements(context: AchievementContext): Promise<Achievement[]> {
  // Check each achievement definition
  // Return newly unlocked achievements
}
```

### 3. Forest Integration
**Location:** `forest/page.tsx`

- Add badge/achievement icons to tree visualization
- Show per-contact badges in tree detail modal
- Recovery badge tracking ties to health state changes

### 4. Home Screen Integration
**Location:** `page.tsx`

```tsx
// In header section
<div className="flex items-center gap-2">
  <span className="text-2xl">🔥</span>
  <span className="font-bold">{streakDays}</span>
  <span className="text-sm text-gray-500">day streak</span>
</div>
```

### 5. Notification Integration
**Leverage existing:** Capacitor LocalNotifications

```typescript
// Streak danger notification
LocalNotifications.schedule({
  notifications: [{
    title: "Your streak is at risk! 🔥",
    body: "Log a catch-up today to keep your 28-day streak alive",
    schedule: { at: streakEndTime.subtract(6, 'hours') }
  }]
});
```

---

## Part 6: Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Over-gamification feels manipulative | Keep badges earnest, not aggressive. No shame language. |
| Streak anxiety | Multiple protection mechanisms (freeze, weekend flex, grace period) |
| Performance with achievement checks | Batch evaluate on interaction, not every page load |
| Badge inflation | Start with 14 meaningful badges, don't add more without reason |
| Monthly report slow to generate | Cache in monthly_reports table, generate async |

---

## Part 7: Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| DAU increase | +25% | Daily active users after streak launch |
| 7-day retention | +15% | Users returning after 7 days |
| Avg streak length | >14 days | Mean streak across active users |
| Badge unlock rate | >50% | % of users earning at least one badge |
| Monthly report views | >60% | % of users viewing their monthly report |

---

## Part 8: Out of Scope (Future Phases)

These were mentioned in original requirements but deferred:

1. **Social sharing** - Share achievements to social media
2. **Download summary card** - Generate image of monthly report
3. **AI-powered suggestions** - "Thoughtful Touch" badge requiring memory analysis
4. **Leaderboards** - Competitive elements between users
5. **Custom achievements** - User-defined badges
6. **Streak gifting** - Friends can gift streak freezes

---

## Appendix: Type Definitions

```typescript
// /src/types/achievements.ts

export interface UserStreak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastInteractionDate: string | null;
  streakStartedAt: string | null;
  freezesUsedThisWeek: number;
  weekFreezeResetDate: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'consistency' | 'recovery' | 'quality';
  thresholdValue: number;
  thresholdType: string;
  isPerContact: boolean;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  connectionId: string | null;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  // Joined data
  achievement?: AchievementDefinition;
}

export interface ConnectionStreak {
  id: string;
  connectionId: string;
  userId: string;
  currentCycleStreak: number;
  longestCycleStreak: number;
  lastCycleMetAt: string | null;
  worstHealthReached: string | null;
  wasEverWilting: boolean;
  restoredFromWiltingAt: string | null;
}

export interface MonthlyReport {
  id: string;
  userId: string;
  reportMonth: string;
  reportData: MonthlyReportData;
  viewedAt: string | null;
  generatedAt: string;
}

export interface MonthlyReportData {
  streak: {
    current: number;
    daysToNextMilestone: number;
    nextMilestone: number;
  };
  interactions: {
    total: number;
    byType: {
      in_person: number;
      call: number;
      text: number;
      other: number;
    };
  };
  forestHealth: {
    current: number;
    previous: number;
    change: number;
  };
  achievements: {
    unlocked: string[];
    inProgress: Array<{
      id: string;
      progress: number;
      remaining: number;
    }>;
  };
  connections: {
    thriving: string[];
    needsAttention: Array<{
      id: string;
      name: string;
      reason: string;
    }>;
  };
  patterns: {
    mostActiveDay: string;
    preferredType: string;
    categoryBreakdown: Record<string, number>;
  };
  suggestions: string[];
}
```

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Single daily interaction (any contact) for streak | Lower barrier = higher engagement, prevents obsessive single-contact focus |
| Auto-freeze vs manual freeze | Reduces friction, users don't have to remember to "use" a freeze |
| Weekend flex (Fri-Sun window) | Acknowledges natural social patterns, reduces Sunday night panic |
| 14 total badges at launch | Enough variety without overwhelming, leaves room for expansion |
| Per-contact badges limited to consistency only | Recovery/quality are better measured globally |
| JSON storage for monthly report | Flexibility for evolving report contents without migrations |
| Cache monthly reports | Performance - expensive aggregation queries only run once |

---

*Document created: January 2026*
*Last updated: January 2026*
*Status: Ready for implementation*
