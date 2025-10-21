-- Apps table for storing iTunes/App Store data
CREATE TABLE IF NOT EXISTS public.apps (
  -- Primary identifiers
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id BIGINT UNIQUE NOT NULL, -- iTunes trackId
  
  -- Basic app info
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  description TEXT,
  bundle_id TEXT,
  
  -- Pricing and availability
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_free BOOLEAN DEFAULT TRUE,
  
  -- Categories and classification
  primary_genre TEXT,
  category TEXT, -- Our normalized category
  subcategory TEXT,
  genres JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  
  -- Ratings and reviews
  average_user_rating DECIMAL(3,2),
  user_rating_count INTEGER,
  
  -- Media assets
  artwork_url_60 TEXT,
  artwork_url_100 TEXT,
  artwork_url_512 TEXT,
  screenshot_urls JSONB DEFAULT '[]',
  
  -- App metadata
  release_date TIMESTAMP WITH TIME ZONE,
  version TEXT,
  track_view_url TEXT,
  content_advisory_rating TEXT,
  minimum_os_version TEXT,
  file_size_bytes BIGINT,
  
  -- Our metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS apps_track_id_idx ON public.apps(track_id);
CREATE INDEX IF NOT EXISTS apps_category_idx ON public.apps(category);
CREATE INDEX IF NOT EXISTS apps_is_free_idx ON public.apps(is_free);
CREATE INDEX IF NOT EXISTS apps_rating_idx ON public.apps(average_user_rating);
CREATE INDEX IF NOT EXISTS apps_keywords_idx ON public.apps USING GIN(keywords);
CREATE INDEX IF NOT EXISTS apps_price_idx ON public.apps(price);
CREATE INDEX IF NOT EXISTS apps_active_idx ON public.apps(is_active);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS apps_search_idx ON public.apps 
  USING GIN(to_tsvector('english', track_name || ' ' || COALESCE(description, '') || ' ' || artist_name));

-- Enable RLS
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Public read access to apps
CREATE POLICY "Apps are publicly viewable" ON public.apps
  FOR SELECT USING (is_active = TRUE);

-- User preferences table for the questionnaire
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL, -- For anonymous users
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- For logged-in users
  
  -- Questionnaire responses
  lifestyle JSONB DEFAULT '[]', -- e.g., ["active", "busy", "creative"]
  goals JSONB DEFAULT '[]', -- e.g., ["productivity", "health", "entertainment"]
  interests JSONB DEFAULT '[]', -- e.g., ["fitness", "music", "cooking"]
  budget_preference TEXT CHECK (budget_preference IN ('free', 'paid', 'mixed')),
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'both')),
  
  -- Preferences metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user preferences
CREATE INDEX IF NOT EXISTS user_prefs_session_idx ON public.user_preferences(session_id);
CREATE INDEX IF NOT EXISTS user_prefs_user_idx ON public.user_preferences(user_id);

-- Enable RLS for user preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for user preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (
    auth.uid() = user_id OR 
    session_id = current_setting('app.session_id', true)
  );

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL
  );

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    session_id = current_setting('app.session_id', true)
  );

-- Recommendation sessions table
CREATE TABLE IF NOT EXISTS public.recommendation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input data
  user_preferences_id UUID REFERENCES public.user_preferences(id),
  query_text TEXT,
  filters JSONB DEFAULT '{}',
  
  -- AI processing
  filtered_app_count INTEGER,
  llm_model TEXT,
  llm_prompt_tokens INTEGER,
  llm_completion_tokens INTEGER,
  
  -- Results
  recommended_apps JSONB DEFAULT '[]', -- Array of app IDs with scores
  result_count INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_time_ms INTEGER
);

-- Indexes for recommendation sessions
CREATE INDEX IF NOT EXISTS rec_sessions_session_idx ON public.recommendation_sessions(session_id);
CREATE INDEX IF NOT EXISTS rec_sessions_user_idx ON public.recommendation_sessions(user_id);
CREATE INDEX IF NOT EXISTS rec_sessions_created_idx ON public.recommendation_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE public.recommendation_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for recommendation sessions
CREATE POLICY "Users can view their own recommendation sessions" ON public.recommendation_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    session_id = current_setting('app.session_id', true)
  );

CREATE POLICY "Users can insert their own recommendation sessions" ON public.recommendation_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL
  );

-- Updated at trigger for apps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS apps_updated_at ON public.apps;
CREATE TRIGGER apps_updated_at
  BEFORE UPDATE ON public.apps
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS user_prefs_updated_at ON public.user_preferences;
CREATE TRIGGER user_prefs_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();