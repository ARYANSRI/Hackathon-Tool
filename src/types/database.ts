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
      events: {
        Row: {
          id: string
          name: string
          status: 'upcoming' | 'live' | 'ended'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'upcoming' | 'live' | 'ended'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'upcoming' | 'live' | 'ended'
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          event_id: string
          name: string
          registration_token: string
          registration_open: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          registration_token: string
          registration_open?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          registration_token?: string
          registration_open?: boolean
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          room_id: string
          name: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          name: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          name?: string
          code?: string
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          team_id: string
          name: string
          is_leader: boolean
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          is_leader?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          is_leader?: boolean
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          member_id: string
          device_token: string
          last_seen: string
        }
        Insert: {
          id?: string
          member_id: string
          device_token: string
          last_seen?: string
        }
        Update: {
          id?: string
          member_id?: string
          device_token?: string
          last_seen?: string
        }
      }
      rounds: {
        Row: {
          id: string
          event_id: string
          order: number
          type: 'quiz' | 'build'
          status: 'upcoming' | 'live' | 'ended'
          starts_at: string | null
          ends_at: string | null
          config: Json
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          order?: number
          type: 'quiz' | 'build'
          status?: 'upcoming' | 'live' | 'ended'
          starts_at?: string | null
          ends_at?: string | null
          config?: Json
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          order?: number
          type?: 'quiz' | 'build'
          status?: 'upcoming' | 'live' | 'ended'
          starts_at?: string | null
          ends_at?: string | null
          config?: Json
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          round_id: string
          order: number
          text: string
          options: Json
          correct_index: number
          time_limit: number
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          order?: number
          text: string
          options: Json
          correct_index: number
          time_limit?: number
          created_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          order?: number
          text?: string
          options?: Json
          correct_index?: number
          time_limit?: number
          created_at?: string
        }
      }
      question_runs: {
        Row: {
          id: string
          question_id: string
          started_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          question_id: string
          started_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          question_id?: string
          started_at?: string
          closed_at?: string | null
        }
      }
      answers: {
        Row: {
          id: string
          question_run_id: string
          member_id: string
          team_id: string
          option: number
          received_at: string
          points: number
        }
        Insert: {
          id?: string
          question_run_id: string
          member_id: string
          team_id: string
          option: number
          received_at?: string
          points?: number
        }
        Update: {
          id?: string
          question_run_id?: string
          member_id?: string
          team_id?: string
          option?: number
          received_at?: string
          points?: number
        }
      }
      leaderboard_cache: {
        Row: {
          id: string
          scope: 'room' | 'global'
          room_id: string | null
          payload: Json
          updated_at: string
        }
        Insert: {
          id?: string
          scope: 'room' | 'global'
          room_id?: string | null
          payload?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          scope?: 'room' | 'global'
          room_id?: string | null
          payload?: Json
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          team_id: string
          round_id: string
          github_url: string | null
          deploy_url: string | null
          docs_url: string | null
          description: string | null
          status: 'draft' | 'final'
          updated_at: string
          submitted_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          round_id: string
          github_url?: string | null
          deploy_url?: string | null
          docs_url?: string | null
          description?: string | null
          status?: 'draft' | 'final'
          updated_at?: string
          submitted_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          round_id?: string
          github_url?: string | null
          deploy_url?: string | null
          docs_url?: string | null
          description?: string | null
          status?: 'draft' | 'final'
          updated_at?: string
          submitted_at?: string | null
        }
      }
    }
    Views: {
      public_questions: {
        Row: {
          id: string
          round_id: string
          order: number
          text: string
          options: Json
          time_limit: number
          correct_index: number | null
          active_question_run_id: string | null
          question_started_at: string | null
          question_closed_at: string | null
        }
      }
    }
  }
}
