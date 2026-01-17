# Database Trigger Setup Instructions

## Current Status
✅ Trigger is partially working (metadata updates)  
❌ Auto quality scoring not working  
📝 Manual setup required in Supabase SQL Editor  

## Required Actions

### 1. Run in Supabase SQL Editor

Go to your Supabase dashboard → SQL Editor and run these files **in order**:

#### Step 1: Update Quality Score Function
```sql
-- Run fix_quality_score_function.sql
-- This fixes JSONB type handling in the scoring function
```

#### Step 2: Update Trigger Function  
```sql
-- Run fix_unified_trigger.sql
-- This fixes the trigger to properly call the quality score function
```

### 2. Test the Setup

After running both SQL files, test with:
```bash
node test_trigger_fix.js
```

Expected output should show:
- ✅ Auto-calculated quality score > 0
- ✅ Reconciliation count incrementing
- ✅ Last reconciled timestamp updating

### 3. Verification

If successful, you should see:
```
🎉 Trigger is working! Quality score auto-calculated: [score]
🎉 Database trigger is working properly!
```

## Why Manual Setup is Needed

The Supabase JavaScript client doesn't support executing complex DDL statements with CREATE FUNCTION and CREATE TRIGGER. These must be run through the SQL Editor interface.

## Files to Run
1. `fix_quality_score_function.sql` - Updates scoring function with proper JSONB handling
2. `fix_unified_trigger.sql` - Recreates trigger with fixed function calls

## Alternative: Keep Manual Scoring

If you prefer to keep the current manual quality scoring approach (which is working perfectly), you can skip this setup. The reconciliation system works fine with manual scoring as demonstrated in Phase 5 testing.