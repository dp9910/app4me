-- Simple Apps Table for iTunes Data
CREATE TABLE IF NOT EXISTS public.apps (
  id SERIAL PRIMARY KEY,
  track_id BIGINT UNIQUE NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_free BOOLEAN DEFAULT TRUE,
  primary_genre TEXT,
  average_user_rating DECIMAL(3,2),
  user_rating_count INTEGER,
  artwork_url_100 TEXT,
  track_view_url TEXT,
  release_date TEXT,
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (but allow public read for now)
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access
CREATE POLICY "Allow public read access to apps" ON public.apps
  FOR SELECT USING (true);

-- Policy to allow service role to insert/update
CREATE POLICY "Allow service role to modify apps" ON public.apps
  FOR ALL USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS apps_track_id_idx ON public.apps(track_id);
CREATE INDEX IF NOT EXISTS apps_primary_genre_idx ON public.apps(primary_genre);
CREATE INDEX IF NOT EXISTS apps_is_free_idx ON public.apps(is_free);