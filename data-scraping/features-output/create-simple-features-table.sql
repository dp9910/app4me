
      CREATE TABLE IF NOT EXISTS app_features_simple (
        id SERIAL PRIMARY KEY,
        app_id TEXT UNIQUE NOT NULL,
        app_title TEXT,
        app_category TEXT,
        
        -- Processing metadata
        processed_at TIMESTAMP DEFAULT NOW(),
        processing_time_ms INTEGER,
        
        -- All features stored as JSON for flexibility
        features JSONB NOT NULL,
        
        -- Extracted key fields for indexing
        primary_use_case TEXT,
        quality_score DECIMAL(3,2),
        category_entertainment DECIMAL(4,1),
        category_productivity DECIMAL(4,1),
        
        -- Top keywords as array for search
        top_keywords TEXT[]
      );
      
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_app_id ON app_features_simple(app_id);
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_quality ON app_features_simple(quality_score DESC);
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_entertainment ON app_features_simple(category_entertainment DESC);
      CREATE INDEX IF NOT EXISTS idx_app_features_simple_keywords ON app_features_simple USING GIN(top_keywords);
    