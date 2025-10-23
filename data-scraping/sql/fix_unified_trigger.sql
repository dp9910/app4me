-- Fix the update_reconciliation_metadata trigger function
-- The function is trying to call jsonb_array_length on string fields

DROP FUNCTION IF EXISTS update_reconciliation_metadata() CASCADE;

-- Recreate function with proper JSONB handling
CREATE OR REPLACE FUNCTION update_reconciliation_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_reconciled = NOW();
  NEW.reconciliation_count = COALESCE(OLD.reconciliation_count, 0) + 1;
  
  -- Calculate data quality score with proper JSONB handling
  DECLARE
    categories_jsonb JSONB;
    screenshots_jsonb JSONB;
  BEGIN
    -- Safely convert all_categories to JSONB
    IF NEW.all_categories IS NOT NULL THEN
      IF pg_typeof(NEW.all_categories) = 'jsonb'::regtype THEN
        categories_jsonb = NEW.all_categories;
      ELSE
        -- Try to parse as JSONB, fallback to empty array
        BEGIN
          categories_jsonb = NEW.all_categories::JSONB;
        EXCEPTION 
          WHEN OTHERS THEN
            categories_jsonb = '[]'::JSONB;
        END;
      END IF;
    ELSE
      categories_jsonb = '[]'::JSONB;
    END IF;

    -- Safely handle screenshots
    IF NEW.screenshots IS NOT NULL THEN
      screenshots_jsonb = NEW.screenshots;
    ELSE
      screenshots_jsonb = '{}'::JSONB;
    END IF;

    NEW.data_quality_score = calculate_data_quality_score(
      NEW.title,
      NEW.description,
      NEW.rating,
      NEW.rating_count,
      NEW.icon_url,
      screenshots_jsonb,
      NEW.developer,
      categories_jsonb
    );
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_unified_metadata
  BEFORE INSERT OR UPDATE ON apps_unified
  FOR EACH ROW
  EXECUTE FUNCTION update_reconciliation_metadata();

-- Test the function
SELECT 'Trigger function updated successfully' as message;