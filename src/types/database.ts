export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          id: string
          user_id: string
          name: string
          relationship: string | null
          catchup_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually'
          last_interaction_date: string | null
          next_catchup_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          relationship?: string | null
          catchup_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually'
          last_interaction_date?: string | null
          next_catchup_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          relationship?: string | null
          catchup_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually'
          last_interaction_date?: string | null
          next_catchup_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          id: string
          connection_id: string
          user_id: string
          interaction_type: 'call' | 'text' | 'in_person' | 'other'
          memory: string | null
          interaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          connection_id: string
          user_id: string
          interaction_type: 'call' | 'text' | 'in_person' | 'other'
          memory?: string | null
          interaction_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          connection_id?: string
          user_id?: string
          interaction_type?: 'call' | 'text' | 'in_person' | 'other'
          memory?: string | null
          interaction_date?: string
          created_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          notifications_enabled: boolean
          notification_time: string
          weekly_reflection_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notifications_enabled?: boolean
          notification_time?: string
          weekly_reflection_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notifications_enabled?: boolean
          notification_time?: string
          weekly_reflection_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_reflections: {
        Row: {
          id: string
          user_id: string
          week_date: string
          most_connected_id: string | null
          grow_closer_id: string | null
          reflection_notes: string | null
          grow_closer_followup_date: string | null
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_date: string
          most_connected_id?: string | null
          grow_closer_id?: string | null
          reflection_notes?: string | null
          grow_closer_followup_date?: string | null
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_date?: string
          most_connected_id?: string | null
          grow_closer_id?: string | null
          reflection_notes?: string | null
          grow_closer_followup_date?: string | null
          completed_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    CompositeTypes: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      interaction_type: 'call' | 'text' | 'in_person' | 'other'
      catchup_frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually'
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Connection = Database['public']['Tables']['connections']['Row']
export type Interaction = Database['public']['Tables']['interactions']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type WeeklyReflection = Database['public']['Tables']['weekly_reflections']['Row']
export type InteractionType = Database['public']['Enums']['interaction_type']
export type CatchupFrequency = Database['public']['Enums']['catchup_frequency']

// Streak & Achievement Types
export interface UserStreak {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_interaction_date: string | null
  streak_started_at: string | null
  freezes_used_this_week: number
  week_freeze_reset_date: string
  created_at: string
  updated_at: string
}

export type AchievementCategory = 'streak' | 'consistency' | 'recovery' | 'quality'

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  threshold_value: number | null
  threshold_type: string | null
  is_per_contact: boolean
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  connection_id: string | null
  current_progress: number
  is_unlocked: boolean
  unlocked_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  achievement?: AchievementDefinition
}

export interface ConnectionStreak {
  id: string
  connection_id: string
  user_id: string
  current_cycle_streak: number
  longest_cycle_streak: number
  last_cycle_met_at: string | null
  worst_health_reached: string | null
  was_ever_wilting: boolean
  restored_from_wilting_at: string | null
  created_at: string
  updated_at: string
}

export interface MonthlyReportData {
  streak: {
    current: number
    daysToNextMilestone: number
    nextMilestone: number
  }
  interactions: {
    total: number
    byType: {
      in_person: number
      call: number
      text: number
      other: number
    }
  }
  forestHealth: {
    current: number
    previous: number
    change: number
  }
  achievements: {
    unlocked: string[]
    inProgress: Array<{
      id: string
      progress: number
      remaining: number
    }>
  }
  connections: {
    thriving: string[]
    needsAttention: Array<{
      id: string
      name: string
      reason: string
    }>
  }
  patterns: {
    mostActiveDay: string
    preferredType: string
    categoryBreakdown: Record<string, number>
  }
  suggestions: string[]
}

export interface MonthlyReport {
  id: string
  user_id: string
  report_month: string
  report_data: MonthlyReportData
  viewed_at: string | null
  generated_at: string
}
