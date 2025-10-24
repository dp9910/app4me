-- Enhanced Feature Storage Schema for App Recommendation System
-- FIXED VERSION: Works with existing itunes_apps composite constraint
-- Stores extracted features from the feature engineering pipeline

-- Main app features table
CREATE TABLE IF NOT EXISTS app_features (
    id BIGSERIAL PRIMARY KEY,
    app_id TEXT NOT NULL UNIQUE, -- bundle_id from apps
    
    -- Processing metadata
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,
    feature_version TEXT DEFAULT '1.0',
    
    -- Metadata features (structured)
    metadata_category_primary TEXT,
    metadata_category_all TEXT[], -- Array of additional categories
    metadata_price_tier TEXT CHECK (metadata_price_tier IN ('free', 'low', 'medium', 'high', 'unknown')),
    metadata_rating_tier TEXT CHECK (metadata_rating_tier IN ('excellent', 'good', 'average', 'below_average', 'poor')),
    metadata_popularity_score DECIMAL(3,2) CHECK (metadata_popularity_score >= 0 AND metadata_popularity_score <= 1),
    metadata_recency_score DECIMAL(3,2) CHECK (metadata_recency_score >= 0 AND metadata_recency_score <= 1),
    metadata_developer_name TEXT,
    metadata_developer_id TEXT,
    
    -- Quality signals
    quality_signals DECIMAL(3,2) CHECK (quality_signals >= 0 AND quality_signals <= 1),
    
    -- Category classification scores
    category_productivity DECIMAL(4,1) DEFAULT 0,
    category_finance DECIMAL(4,1) DEFAULT 0,
    category_health DECIMAL(4,1) DEFAULT 0,
    category_entertainment DECIMAL(4,1) DEFAULT 0,
    category_education DECIMAL(4,1) DEFAULT 0,
    
    -- LLM-extracted features
    llm_primary_use_case TEXT,
    llm_use_cases TEXT[], -- Array of use cases
    llm_target_personas TEXT[], -- Array of target personas
    llm_problem_solved TEXT,
    llm_key_features TEXT[], -- Array of key features
    llm_limitations TEXT[], -- Array of limitations
    llm_best_for_keywords TEXT[], -- Array of keywords
    llm_not_good_for TEXT[], -- Array of scenarios
    llm_emotional_tone TEXT CHECK (llm_emotional_tone IN ('professional', 'casual', 'playful', 'serious')),
    llm_complexity_level TEXT CHECK (llm_complexity_level IN ('beginner', 'intermediate', 'advanced')),
    llm_time_commitment TEXT CHECK (llm_time_commitment IN ('quick', 'moderate', 'intensive'))
    
    -- NOTE: Removed foreign key constraint to avoid the unique constraint error
    -- You can add it back after fixing the itunes_apps table constraint
    -- CONSTRAINT fk_app_features_app_id FOREIGN KEY (app_id) REFERENCES itunes_apps(bundle_id) ON DELETE CASCADE
);

-- Separate table for TF-IDF keywords (normalized for better querying)
CREATE TABLE IF NOT EXISTS app_keywords_tfidf (
    id BIGSERIAL PRIMARY KEY,
    app_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    score DECIMAL(6,3) NOT NULL, -- TF-IDF score
    categories TEXT[], -- Categories this keyword belongs to
    
    -- Composite unique constraint
    UNIQUE(app_id, keyword)
    
    -- NOTE: Removed foreign key constraint to avoid the unique constraint error
    -- CONSTRAINT fk_keywords_app_id FOREIGN KEY (app_id) REFERENCES itunes_apps(bundle_id) ON DELETE CASCADE
);

-- Table for keyword-category mappings (for analysis)
CREATE TABLE IF NOT EXISTS keyword_categories (
    id BIGSERIAL PRIMARY KEY,
    keyword TEXT NOT NULL,
    category TEXT NOT NULL,
    
    UNIQUE(keyword, category)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_features_app_id ON app_features(app_id);
CREATE INDEX IF NOT EXISTS idx_app_features_processed_at ON app_features(processed_at);
CREATE INDEX IF NOT EXISTS idx_app_features_quality_signals ON app_features(quality_signals DESC);
CREATE INDEX IF NOT EXISTS idx_app_features_popularity ON app_features(metadata_popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_app_features_category_entertainment ON app_features(category_entertainment DESC);
CREATE INDEX IF NOT EXISTS idx_app_features_category_productivity ON app_features(category_productivity DESC);

CREATE INDEX IF NOT EXISTS idx_keywords_app_id ON app_keywords_tfidf(app_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON app_keywords_tfidf(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_score ON app_keywords_tfidf(score DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_categories ON app_keywords_tfidf USING GIN(categories);

-- Full-text search indexes for LLM features
CREATE INDEX IF NOT EXISTS idx_app_features_use_case_search ON app_features USING GIN(to_tsvector('english', llm_primary_use_case));
CREATE INDEX IF NOT EXISTS idx_app_features_problem_search ON app_features USING GIN(to_tsvector('english', llm_problem_solved));

-- Views for common queries

-- View for app recommendations with all features
CREATE OR REPLACE VIEW app_features_complete AS
SELECT 
    af.app_id,
    af.processed_at,
    af.metadata_category_primary,
    af.metadata_price_tier,
    af.metadata_rating_tier,
    af.metadata_popularity_score,
    af.metadata_recency_score,
    af.quality_signals,
    af.category_productivity,
    af.category_finance,
    af.category_health,
    af.category_entertainment,
    af.category_education,
    af.llm_primary_use_case,
    af.llm_use_cases,
    af.llm_target_personas,
    af.llm_emotional_tone,
    af.llm_complexity_level,
    af.llm_time_commitment,
    -- Top 5 keywords as aggregated field
    (
        SELECT json_agg(
            json_build_object(
                'keyword', kt.keyword,
                'score', kt.score,
                'categories', kt.categories
            ) ORDER BY kt.score DESC
        )
        FROM app_keywords_tfidf kt 
        WHERE kt.app_id = af.app_id 
        LIMIT 5
    ) as top_keywords,
    -- App basic info from itunes_apps (first match for bundle_id)
    (SELECT title FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as title,
    (SELECT developer FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as developer,
    (SELECT category FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as category,
    (SELECT description FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as description,
    (SELECT rating FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as rating,
    (SELECT rating_count FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as rating_count,
    (SELECT formatted_price FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as formatted_price,
    (SELECT icon_url FROM itunes_apps ia WHERE ia.bundle_id = af.app_id LIMIT 1) as icon_url
FROM app_features af;

-- View for keyword analysis
CREATE OR REPLACE VIEW keyword_popularity AS
SELECT 
    keyword,
    COUNT(*) as app_count,
    AVG(score) as avg_score,
    MAX(score) as max_score,
    categories
FROM app_keywords_tfidf
GROUP BY keyword, categories
ORDER BY app_count DESC, avg_score DESC;

-- Functions for feature-based recommendations

-- Function to find similar apps based on keywords
CREATE OR REPLACE FUNCTION find_similar_apps_by_keywords(
    target_app_id TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    app_id TEXT,
    similarity_score DECIMAL,
    shared_keywords INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH target_keywords AS (
        SELECT keyword, score
        FROM app_keywords_tfidf
        WHERE app_id = target_app_id
    ),
    app_similarities AS (
        SELECT 
            kt.app_id,
            COUNT(*) as shared_keywords,
            SUM(kt.score * tk.score) / 
            (
                SQRT(SUM(kt.score * kt.score)) * 
                SQRT(SUM(tk.score * tk.score))
            ) as cosine_similarity
        FROM app_keywords_tfidf kt
        JOIN target_keywords tk ON kt.keyword = tk.keyword
        WHERE kt.app_id != target_app_id
        GROUP BY kt.app_id
        HAVING COUNT(*) >= 2 -- At least 2 shared keywords
    )
    SELECT 
        app_similarities.app_id,
        app_similarities.cosine_similarity,
        app_similarities.shared_keywords
    FROM app_similarities
    ORDER BY app_similarities.cosine_similarity DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get apps by category with quality threshold
CREATE OR REPLACE FUNCTION get_quality_apps_by_category(
    category_name TEXT,
    quality_threshold DECIMAL DEFAULT 0.7,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    app_id TEXT,
    title TEXT,
    quality_score DECIMAL,
    primary_use_case TEXT,
    top_keywords JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        afc.app_id,
        afc.title,
        afc.quality_signals,
        afc.llm_primary_use_case,
        afc.top_keywords
    FROM app_features_complete afc
    WHERE 
        (
            CASE category_name
                WHEN 'productivity' THEN afc.category_productivity >= 5.0
                WHEN 'finance' THEN afc.category_finance >= 5.0
                WHEN 'health' THEN afc.category_health >= 5.0
                WHEN 'entertainment' THEN afc.category_entertainment >= 5.0
                WHEN 'education' THEN afc.category_education >= 5.0
                ELSE false
            END
        )
        AND afc.quality_signals >= quality_threshold
    ORDER BY afc.quality_signals DESC, afc.metadata_popularity_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'App features schema created successfully (without foreign keys)!' as message,
       'Run fix-bundle-id-constraint.sql first, then add foreign keys back' as next_step;