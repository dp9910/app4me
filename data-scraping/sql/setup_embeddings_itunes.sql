-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for semantic search (using iTunes apps as source)
CREATE TABLE app_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT REFERENCES itunes_apps(app_id) ON DELETE CASCADE UNIQUE,
  
  -- The embedding vector (Gemini text-embedding-004 = 768 dimensions)
  embedding VECTOR(768) NOT NULL,
  
  -- Metadata for debugging/tracking
  embedding_model TEXT DEFAULT 'text-embedding-004',
  text_used TEXT, -- What text was embedded (for debugging)
  token_count INTEGER, -- How many tokens
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast similarity search (CRITICAL!)
CREATE INDEX ON app_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Optional: Create index on app_id for joins
CREATE INDEX idx_app_embeddings_app_id ON app_embeddings(app_id);

-- Helper function for similarity search with iTunes apps
CREATE OR REPLACE FUNCTION search_apps_by_embedding(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  app_id TEXT,
  similarity FLOAT,
  app_name TEXT,
  app_category TEXT,
  app_rating DECIMAL,
  app_icon TEXT,
  app_description TEXT,
  app_price TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.app_id,
    1 - (ae.embedding <=> query_embedding) AS similarity,
    a.name AS app_name,
    a.primary_category AS app_category,
    a.rating_average AS app_rating,
    a.icon_url_512 AS app_icon,
    a.description AS app_description,
    a.formatted_price AS app_price
  FROM app_embeddings ae
  JOIN itunes_apps a ON a.app_id = ae.app_id
  WHERE 
    1 - (ae.embedding <=> query_embedding) > match_threshold
  ORDER BY ae.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Table for search quality monitoring
CREATE TABLE IF NOT EXISTS search_quality_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  top_similarity_score DECIMAL(4,3),
  avg_similarity_score DECIMAL(4,3),
  result_count INTEGER,
  user_clicked BOOLEAN,
  user_liked BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for search logs
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_quality_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_quality_logs(query);

-- Function to get embedding coverage stats
CREATE OR REPLACE FUNCTION get_embedding_coverage()
RETURNS TABLE (
  total_apps INTEGER,
  embedded_apps INTEGER,
  coverage_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_count INTEGER;
  embedded_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM itunes_apps;
  SELECT COUNT(*) INTO embedded_count FROM app_embeddings;
  
  RETURN QUERY
  SELECT 
    total_count,
    embedded_count,
    CASE 
      WHEN total_count > 0 THEN (embedded_count::DECIMAL / total_count * 100)
      ELSE 0
    END;
END;
$$;