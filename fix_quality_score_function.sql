-- Fix the calculate_data_quality_score function to handle different data types properly
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS calculate_data_quality_score CASCADE;

-- Recreate function with proper type handling
CREATE OR REPLACE FUNCTION calculate_data_quality_score(
  p_title TEXT,
  p_description TEXT,
  p_rating DECIMAL,
  p_rating_count BIGINT,
  p_icon_url TEXT,
  p_screenshots JSONB,
  p_developer TEXT,
  p_categories JSONB
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  categories_count INTEGER := 0;
  screenshots_count INTEGER := 0;
BEGIN
  -- Basic info (40 points)
  IF p_title IS NOT NULL AND LENGTH(p_title) > 0 THEN 
    score := score + 10; 
  END IF;
  
  IF p_description IS NOT NULL AND LENGTH(p_description) > 50 THEN 
    score := score + 15; 
  END IF;
  
  IF p_developer IS NOT NULL AND LENGTH(p_developer) > 0 THEN 
    score := score + 10; 
  END IF;
  
  -- Safe category counting
  IF p_categories IS NOT NULL THEN
    BEGIN
      -- Handle if it's an array
      IF jsonb_typeof(p_categories) = 'array' THEN
        categories_count := jsonb_array_length(p_categories);
      -- Handle if it's an object (like screenshots structure)
      ELSIF jsonb_typeof(p_categories) = 'object' THEN
        categories_count := (SELECT COUNT(*) FROM jsonb_object_keys(p_categories));
      END IF;
      
      IF categories_count > 0 THEN 
        score := score + 5; 
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If any error, just skip category scoring
        NULL;
    END;
  END IF;
  
  -- Rating data (30 points)
  IF p_rating IS NOT NULL AND p_rating > 0 THEN 
    score := score + 10; 
  END IF;
  
  IF p_rating_count IS NOT NULL AND p_rating_count > 0 THEN 
    IF p_rating_count > 1000 THEN 
      score := score + 20;
    ELSIF p_rating_count > 100 THEN 
      score := score + 15;
    ELSIF p_rating_count > 10 THEN 
      score := score + 10;
    ELSE 
      score := score + 5;
    END IF;
  END IF;
  
  -- Media assets (30 points)
  IF p_icon_url IS NOT NULL AND LENGTH(p_icon_url) > 0 THEN 
    score := score + 10; 
  END IF;
  
  -- Safe screenshots counting
  IF p_screenshots IS NOT NULL THEN
    BEGIN
      IF jsonb_typeof(p_screenshots) = 'array' THEN
        screenshots_count := jsonb_array_length(p_screenshots);
      ELSIF jsonb_typeof(p_screenshots) = 'object' THEN
        screenshots_count := (SELECT COUNT(*) FROM jsonb_object_keys(p_screenshots));
      END IF;
      
      IF screenshots_count >= 5 THEN 
        score := score + 20;
      ELSIF screenshots_count >= 3 THEN 
        score := score + 15;
      ELSIF screenshots_count >= 1 THEN 
        score := score + 10;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If any error, just skip screenshot scoring
        NULL;
    END;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT calculate_data_quality_score(
  'Test App',
  'This is a test description with more than 50 characters',
  4.5,
  1000,
  'https://example.com/icon.jpg',
  '[]'::jsonb,
  'Test Developer',
  '["Games", "Entertainment"]'::jsonb
) as test_score;

-- Should return a score around 70-80

SELECT 'Quality score function updated successfully' as message;