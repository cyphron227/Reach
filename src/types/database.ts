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
      }
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
export type InteractionType = Database['public']['Enums']['interaction_type']
export type CatchupFrequency = Database['public']['Enums']['catchup_frequency']
