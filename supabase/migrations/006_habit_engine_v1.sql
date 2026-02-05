-- ============================================================================
-- HABIT ENGINE V1 MIGRATION
-- ============================================================================
-- This migration adds support for the Habit Engine v1 features:
-- - Weighted daily actions
-- - 5-tier relationship strength states
-- - Core/Outer ring structure
-- - Feature flags for gradual rollout
--
-- IMPORTANT: All changes are ADDITIVE and can be rolled back.
-- See rollback SQL at the bottom of this file.
-- ============================================================================

-- ============================================================================
-- PART 1: NEW ENUM TYPES
-- ============================================================================

-- Action types with associated weights (weights handled in application code)
-- self_reflection=0.5, text=1.0, social_planning=2.0, call=3.0, group_activity=4.0, in_person_1on1=6.0
CREATE TYPE action_type AS ENUM (
  'self_reflection',
  'text',
  'social_planning',
  'call',
  'group_activity',
  'in_person_1on1'
);

-- 5-tier relationship strength model
-- Flourishing -> Strong -> Stable -> Thinning -> Decaying
CREATE TYPE relationship_strength AS ENUM (
  'flourishing',
  'strong',
  'stable',
  'thinning',
  'decaying'
);

-- Ring tier for core/outer circle organization
CREATE TYPE ring_tier AS ENUM (
  'core',
  'outer'
);

-- Connection lifecycle states
CREATE TYPE connection_lifecycle AS ENUM (
  'active',
  'pending_action',
  'archived'
);

-- ============================================================================
-- PART 2: FEATURE FLAGS TABLE
-- ============================================================================

CREATE TABLE public.feature_flags (
  id varchar(100) PRIMARY KEY,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_for_users uuid[] DEFAULT '{}',
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

-- Public read access for feature flags (no authentication required)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view feature_flags" ON public.feature_flags FOR SELECT USING (true);

-- Auto-update timestamp
CREATE TRIGGER handle_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed initial feature flags (all OFF by default)
INSERT INTO public.feature_flags (id, description, is_enabled, rollout_percentage) VALUES
  ('habit_engine_v1', 'Enable Habit Engine V1 daily tracking', false, 0),
  ('relationship_strength_v2', 'Use 5-tier relationship strength model', false, 0),
  ('ring_structure', 'Enable Core/Outer ring classification', false, 0),
  ('escalation_ladder', 'Show escalation nudges (text->call->in-person)', false, 0),
  ('weekly_pattern_reviews', 'Enable meaning-focused weekly reviews', false, 0),
  ('replacement_mechanism', 'Enable 30-day decay replacement flow', false, 0);

-- ============================================================================
-- PART 3: DAILY ACTIONS TABLE
-- ============================================================================

CREATE TABLE public.daily_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users ON DELETE CASCADE NOT NULL,
  connection_id uuid REFERENCES public.connections ON DELETE CASCADE,
  action_type action_type NOT NULL,
  action_weight decimal(3,1) NOT NULL,
  action_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,

  -- Link to legacy interaction if migrated
  legacy_interaction_id uuid REFERENCES public.interactions(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT NOW() NOT NULL,

  -- Validate weight range
  CONSTRAINT valid_weight CHECK (action_weight >= 0.5 AND action_weight <= 6.0)
);

CREATE INDEX idx_daily_actions_user_date ON public.daily_actions(user_id, action_date);
CREATE INDEX idx_daily_actions_connection ON public.daily_actions(connection_id);
CREATE INDEX idx_daily_actions_action_date ON public.daily_actions(action_date);

-- RLS for daily_actions
ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily_actions" ON public.daily_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_actions" ON public.daily_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_actions" ON public.daily_actions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily_actions" ON public.daily_actions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: DAILY HABIT LOG TABLE (Aggregated daily scores)
-- ============================================================================

CREATE TABLE public.daily_habit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL,

  -- Aggregated metrics
  total_weight decimal(5,1) NOT NULL DEFAULT 0,
  action_count integer NOT NULL DEFAULT 0,

  -- Computed column: is_valid_day = total_weight >= 0.5
  is_valid_day boolean GENERATED ALWAYS AS (total_weight >= 0.5) STORED,

  -- Highest action type for the day (for escalation tracking)
  highest_action action_type,

  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, log_date)
);

CREATE INDEX idx_daily_habit_log_user_date ON public.daily_habit_log(user_id, log_date DESC);
CREATE INDEX idx_daily_habit_log_valid_day ON public.daily_habit_log(user_id, is_valid_day) WHERE is_valid_day = true;

-- RLS for daily_habit_log
ALTER TABLE public.daily_habit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily_habit_log" ON public.daily_habit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_habit_log" ON public.daily_habit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_habit_log" ON public.daily_habit_log FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER handle_daily_habit_log_updated_at
  BEFORE UPDATE ON public.daily_habit_log
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 5: CONNECTION HEALTH V2 TABLE
-- ============================================================================

CREATE TABLE public.connection_health_v2 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid REFERENCES public.connections ON DELETE CASCADE NOT NULL UNIQUE,
  user_id uuid REFERENCES public.users ON DELETE CASCADE NOT NULL,

  -- Ring classification
  ring_tier ring_tier NOT NULL DEFAULT 'outer',
  ring_position integer CHECK (ring_position IS NULL OR (ring_position >= 1 AND ring_position <= 7)),

  -- Relationship strength (5-tier model)
  current_strength relationship_strength NOT NULL DEFAULT 'stable',
  previous_strength relationship_strength,
  strength_changed_at timestamptz,

  -- Decay tracking
  days_since_action integer DEFAULT 0,
  decay_started_at date,
  last_action_date date,
  last_action_type action_type,

  -- Lifecycle
  lifecycle_state connection_lifecycle NOT NULL DEFAULT 'active',
  pending_action_since date,

  -- Escalation ladder tracking
  last_nudge_level integer DEFAULT 0 CHECK (last_nudge_level >= 0 AND last_nudge_level <= 3),
  last_nudge_at timestamptz,

  -- Historical tracking
  total_actions_logged integer DEFAULT 0,
  total_weight_accumulated decimal(8,1) DEFAULT 0,

  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_connection_health_v2_user ON public.connection_health_v2(user_id);
CREATE INDEX idx_connection_health_v2_ring ON public.connection_health_v2(user_id, ring_tier);
CREATE INDEX idx_connection_health_v2_strength ON public.connection_health_v2(user_id, current_strength);
CREATE INDEX idx_connection_health_v2_lifecycle ON public.connection_health_v2(user_id, lifecycle_state);

-- RLS for connection_health_v2
ALTER TABLE public.connection_health_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own connection_health_v2" ON public.connection_health_v2 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connection_health_v2" ON public.connection_health_v2 FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connection_health_v2" ON public.connection_health_v2 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connection_health_v2" ON public.connection_health_v2 FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER handle_connection_health_v2_updated_at
  BEFORE UPDATE ON public.connection_health_v2
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 6: WEEKLY PATTERN REVIEWS TABLE
-- ============================================================================

CREATE TABLE public.weekly_pattern_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,

  -- Pattern analysis (JSONB for flexibility)
  -- Example: {
  --   "dominant_action_type": "text",
  --   "depth_score": 45,
  --   "variety_score": 60,
  --   "consistency_score": 80,
  --   "insight_type": "contact_not_depth",
  --   "insight_message": "You're maintaining contact, not building depth"
  -- }
  patterns jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Generated insights
  primary_insight text,
  secondary_insights text[],

  -- Suggestions (JSONB array)
  suggested_actions jsonb DEFAULT '[]'::jsonb,

  -- Link to legacy reflection (if exists)
  legacy_reflection_id uuid REFERENCES public.weekly_reflections(id) ON DELETE SET NULL,

  generated_at timestamptz DEFAULT NOW() NOT NULL,
  viewed_at timestamptz,

  UNIQUE(user_id, week_start_date)
);

CREATE INDEX idx_weekly_pattern_reviews_user ON public.weekly_pattern_reviews(user_id, week_start_date DESC);

-- RLS for weekly_pattern_reviews
ALTER TABLE public.weekly_pattern_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own weekly_pattern_reviews" ON public.weekly_pattern_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly_pattern_reviews" ON public.weekly_pattern_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly_pattern_reviews" ON public.weekly_pattern_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly_pattern_reviews" ON public.weekly_pattern_reviews FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 7: ADDITIVE COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add v2 columns to connections table
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS ring_tier_v2 ring_tier DEFAULT 'outer',
  ADD COLUMN IF NOT EXISTS ring_position_v2 integer CHECK (ring_position_v2 IS NULL OR (ring_position_v2 >= 1 AND ring_position_v2 <= 7)),
  ADD COLUMN IF NOT EXISTS lifecycle_state_v2 connection_lifecycle DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS use_habit_engine boolean DEFAULT false;

-- Add v2 columns to interactions table
ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS action_type_v2 action_type,
  ADD COLUMN IF NOT EXISTS action_weight_v2 decimal(3,1),
  ADD COLUMN IF NOT EXISTS is_migrated_to_v2 boolean DEFAULT false;

-- Add v2 columns to user_streaks table
ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS valid_days_streak_v2 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_valid_days_v2 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_valid_day_date_v2 date,
  ADD COLUMN IF NOT EXISTS weekly_weight_total_v2 decimal(6,1) DEFAULT 0;

-- ============================================================================
-- ROLLBACK SQL (Run this to completely revert the migration)
-- ============================================================================
--
-- -- Drop new tables
-- DROP TABLE IF EXISTS public.weekly_pattern_reviews CASCADE;
-- DROP TABLE IF EXISTS public.connection_health_v2 CASCADE;
-- DROP TABLE IF EXISTS public.daily_habit_log CASCADE;
-- DROP TABLE IF EXISTS public.daily_actions CASCADE;
-- DROP TABLE IF EXISTS public.feature_flags CASCADE;
--
-- -- Drop new columns from connections
-- ALTER TABLE public.connections
--   DROP COLUMN IF EXISTS ring_tier_v2,
--   DROP COLUMN IF EXISTS ring_position_v2,
--   DROP COLUMN IF EXISTS lifecycle_state_v2,
--   DROP COLUMN IF EXISTS use_habit_engine;
--
-- -- Drop new columns from interactions
-- ALTER TABLE public.interactions
--   DROP COLUMN IF EXISTS action_type_v2,
--   DROP COLUMN IF EXISTS action_weight_v2,
--   DROP COLUMN IF EXISTS is_migrated_to_v2;
--
-- -- Drop new columns from user_streaks
-- ALTER TABLE public.user_streaks
--   DROP COLUMN IF EXISTS valid_days_streak_v2,
--   DROP COLUMN IF EXISTS longest_valid_days_v2,
--   DROP COLUMN IF EXISTS last_valid_day_date_v2,
--   DROP COLUMN IF EXISTS weekly_weight_total_v2;
--
-- -- Drop new enum types
-- DROP TYPE IF EXISTS action_type CASCADE;
-- DROP TYPE IF EXISTS relationship_strength CASCADE;
-- DROP TYPE IF EXISTS ring_tier CASCADE;
-- DROP TYPE IF EXISTS connection_lifecycle CASCADE;
-- ============================================================================
