import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database types (we'll expand these as we build the schema)
export interface App {
  id: string
  app_id: string
  name: string
  developer_name?: string
  primary_category?: string
  short_description?: string
  full_description?: string
  icon_url_512?: string
  app_store_url?: string
  rating_average?: number
  rating_count?: number
  price?: number
  is_free?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface AppAIInsights {
  id: string
  app_id: string
  one_liner_generic?: string
  ai_summary?: string
  problem_tags?: string[]
  lifestyle_tags?: string[]
  use_cases?: any
  generated_at?: string
  updated_at?: string
}

export interface SearchResult extends App {
  ai_insights?: AppAIInsights
  relevance_score?: number
  personalized_one_liner?: string
  match_reason?: string
}