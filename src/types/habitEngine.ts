/**
 * Habit Engine V1 Types
 *
 * This file contains all TypeScript types for the Habit Engine v1 features.
 * These types align with the database schema in migrations/006_habit_engine_v1.sql
 */

// ============================================================================
// ACTION TYPES & WEIGHTS
// ============================================================================

/**
 * Action types for weighted daily habit tracking
 */
export type ActionTypeV2 =
  | 'text'
  | 'call'
  | 'in_person_1on1'

/**
 * Weight values for each action type
 * These represent the "investment value" of each action
 */
export const ACTION_WEIGHTS: Record<ActionTypeV2, number> = {
  text: 1,
  call: 3,
  in_person_1on1: 6,
}

/**
 * Minimum weight required for a valid day
 */
export const VALID_DAY_THRESHOLD = 1

/**
 * Human-readable labels for action types
 */
export const ACTION_LABELS: Record<ActionTypeV2, string> = {
  text: 'Message',
  call: 'Call',
  in_person_1on1: 'In-person',
}

/**
 * Descriptions for action types (for UI tooltips)
 */
export const ACTION_DESCRIPTIONS: Record<ActionTypeV2, string> = {
  text: 'Sending a text, message, or email',
  call: 'Having a phone or video call',
  in_person_1on1: 'Meeting in person',
}

// ============================================================================
// RELATIONSHIP STRENGTH
// ============================================================================

/**
 * 5-tier relationship strength model
 * Flourishing -> Strong -> Stable -> Thinning -> Decaying
 */
export type RelationshipStrength =
  | 'flourishing'
  | 'strong'
  | 'stable'
  | 'thinning'
  | 'decaying'

/**
 * Human-readable labels for relationship strength states
 */
export const STRENGTH_LABELS: Record<RelationshipStrength, string> = {
  flourishing: 'Flourishing',
  strong: 'Strong',
  stable: 'Stable',
  thinning: 'Thinning',
  decaying: 'Decaying',
}

/**
 * Colors for relationship strength visualization
 */
export const STRENGTH_COLORS: Record<RelationshipStrength, string> = {
  flourishing: '#22c55e', // green-500
  strong: '#84cc16', // lime-500
  stable: '#eab308', // yellow-500
  thinning: '#f97316', // orange-500
  decaying: '#ef4444', // red-500
}

/**
 * Decay thresholds in days
 */
export const DECAY_THRESHOLDS = {
  /** 3 days: Start showing thinning signals */
  thinning_signal: 3,
  /** 7 days: Relationship weakening */
  weakening: 7,
  /** 14 days: Relationship eroding */
  erosion: 14,
  /** 30 days: Full decay state */
  decay_state: 30,
}

// ============================================================================
// RING STRUCTURE
// ============================================================================

/**
 * Ring tier for core/outer circle organization
 */
export type RingTier = 'core' | 'outer'

/**
 * Maximum number of connections in the core ring
 */
export const CORE_RING_MAX = 7

/**
 * Human-readable labels for ring tiers
 */
export const RING_LABELS: Record<RingTier, string> = {
  core: 'Core Circle',
  outer: 'Outer Circle',
}

// ============================================================================
// CONNECTION LIFECYCLE
// ============================================================================

/**
 * Connection lifecycle states
 */
export type ConnectionLifecycle = 'active' | 'pending_action' | 'archived'

/**
 * Human-readable labels for lifecycle states
 */
export const LIFECYCLE_LABELS: Record<ConnectionLifecycle, string> = {
  active: 'Active',
  pending_action: 'Needs Decision',
  archived: 'Archived',
}

/**
 * Options for replacement mechanism (30+ days in decay)
 */
export type ReplacementAction = 'reinvest' | 'downgrade' | 'replace' | 'archive'

export const REPLACEMENT_OPTIONS: { value: ReplacementAction; label: string; description: string }[] = [
  { value: 'reinvest', label: 'Reinvest', description: 'Commit to rebuilding this connection' },
  { value: 'downgrade', label: 'Downgrade', description: 'Move to outer circle with lower expectations' },
  { value: 'replace', label: 'Replace', description: 'Make space for someone new in your core circle' },
  { value: 'archive', label: 'Archive', description: 'Remove from active tracking' },
]

// ============================================================================
// ESCALATION LADDER
// ============================================================================

/**
 * Escalation levels for nudging users toward deeper connection
 */
export const ESCALATION_LADDER = [
  { level: 1, action_type: 'text' as ActionTypeV2, label: 'Send a text', suggestion: 'Start with a quick text' },
  { level: 2, action_type: 'call' as ActionTypeV2, label: 'Make a call', suggestion: 'Try giving them a call' },
  { level: 3, action_type: 'in_person_1on1' as ActionTypeV2, label: 'Meet in person', suggestion: 'Plan to meet in person' },
]

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Daily action record (maps to daily_actions table)
 */
export interface DailyAction {
  id: string
  user_id: string
  connection_id: string | null
  action_type: ActionTypeV2
  action_weight: number
  action_date: string
  notes: string | null
  legacy_interaction_id: string | null
  created_at: string
}

/**
 * Insert type for daily_actions
 */
export interface DailyActionInsert {
  user_id: string
  connection_id?: string | null
  action_type: ActionTypeV2
  action_weight: number
  action_date?: string
  notes?: string | null
  legacy_interaction_id?: string | null
}

/**
 * Daily habit log (aggregated daily score, maps to daily_habit_log table)
 */
export interface DailyHabitLog {
  id: string
  user_id: string
  log_date: string
  total_weight: number
  action_count: number
  is_valid_day: boolean
  highest_action: ActionTypeV2 | null
  created_at: string
  updated_at: string
}

/**
 * Connection health v2 record (maps to connection_health_v2 table)
 */
export interface ConnectionHealthV2 {
  id: string
  connection_id: string
  user_id: string
  ring_tier: RingTier
  ring_position: number | null
  current_strength: RelationshipStrength
  previous_strength: RelationshipStrength | null
  strength_changed_at: string | null
  days_since_action: number
  decay_started_at: string | null
  last_action_date: string | null
  last_action_type: ActionTypeV2 | null
  lifecycle_state: ConnectionLifecycle
  pending_action_since: string | null
  last_nudge_level: number
  last_nudge_at: string | null
  total_actions_logged: number
  total_weight_accumulated: number
  created_at: string
  updated_at: string
}

/**
 * Weekly pattern data (stored in patterns JSONB column)
 */
export interface WeeklyPatternData {
  dominant_action_type: ActionTypeV2 | null
  depth_score: number // 0-100, higher = more in-person/calls
  variety_score: number // 0-100, higher = more diverse actions
  consistency_score: number // 0-100, higher = more regular
  insight_type: 'contact_not_depth' | 'good_depth' | 'sporadic' | 'consistent' | 'escalating'
  insight_message: string
}

/**
 * Suggested action for weekly review
 */
export interface SuggestedAction {
  action_type: ActionTypeV2
  target_connection_id?: string
  target_connection_name?: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

/**
 * Weekly pattern review (maps to weekly_pattern_reviews table)
 */
export interface WeeklyPatternReview {
  id: string
  user_id: string
  week_start_date: string
  patterns: WeeklyPatternData
  primary_insight: string | null
  secondary_insights: string[]
  suggested_actions: SuggestedAction[]
  legacy_reflection_id: string | null
  generated_at: string
  viewed_at: string | null
}

/**
 * Feature flag (maps to feature_flags table)
 */
export interface FeatureFlag {
  id: string
  description: string | null
  is_enabled: boolean
  enabled_for_users: string[]
  rollout_percentage: number
  created_at: string
  updated_at: string
}

/**
 * Available feature flag IDs
 */
export type FeatureFlagId =
  | 'habit_engine_v1'
  | 'relationship_strength_v2'
  | 'ring_structure'
  | 'escalation_ladder'
  | 'weekly_pattern_reviews'
  | 'replacement_mechanism'

// ============================================================================
// INSIGHT MESSAGES
// ============================================================================

/**
 * Pre-defined insight messages for weekly reviews
 * Tone: Honest, supportive, loss-aware, non-gamified
 */
export const INSIGHT_MESSAGES = {
  contact_not_depth: "You're maintaining contact, not building depth.",
  good_depth: "You're investing in deep, meaningful connections.",
  sporadic: 'Your connection patterns are sporadic this week.',
  consistent: 'You are building strong, consistent habits.',
  escalating: "You're investing more in your relationships!",

  // Escalation messages
  text_to_call: 'Text keeps contact. Calls build connection.',
  call_to_inperson: 'Calls maintain. In-person moments create bonds.',

  // Loss framing
  decay_warning: "Relationships don't break. They thin.",
  recovery: "Yesterday slipped. Today fixes it.",

  // Identity reinforcement
  identity: "You're becoming someone who shows up.",
  confrontation: "Good intentions don't maintain friendships. Habits do.",
  regret_prevention: "Most people don't lose friends suddenly. They stop investing.",

  // Weekly pattern insights
  consistency_encouragement: "Your consistency is building real momentum. Keep showing up.",
  depth_suggestion: "Consider mixing in more calls or in-person time for deeper connection.",
}
