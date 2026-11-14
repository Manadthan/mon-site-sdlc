export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      collections: {
        Row: {
          cover_path: string | null
          created_at: string
          id: string
          name: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          id?: string
          name: string
          source_url?: string | null
          user_id?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          id?: string
          name?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          image_path: string | null
          owned: boolean
          position: number
          source_image: string | null
          title: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          image_path?: string | null
          owned?: boolean
          position: number
          source_image?: string | null
          title: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          image_path?: string | null
          owned?: boolean
          position?: number
          source_image?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      collection_stats: {
        Row: {
          collection_id: string | null
          owned: number | null
          percent: number | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
