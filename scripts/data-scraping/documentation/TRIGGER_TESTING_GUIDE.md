# Trigger Pipeline Testing Guide

## 🚧 Current Issue
The trigger page navigation seems to have issues. Here's how to test and fix:

## 🔧 Quick Fix Steps

### 1. Kill All Next.js Processes
```bash
pkill -f next
```

### 2. Start Fresh Development Server
```bash
npm run dev
```

### 3. Check Which Port it Starts On
Look for output like:
```
- Local:        http://localhost:3000
```

### 4. Test Navigation
Go to the homepage and click "⚡ Trigger Pipeline" button.

If it doesn't work, manually navigate to: `http://localhost:[PORT]/trigger`

## 🧪 Manual Testing Steps

### Option A: Test via Browser
1. Start dev server: `npm run dev`
2. Open: `http://localhost:3000` (or whatever port shown)
3. Click: "⚡ Trigger Pipeline" button
4. Should open: `/trigger` page with simple interface
5. Click: "⚡ Trigger Pipeline" on that page
6. Watch: Logs should show iTunes API test

### Option B: Test API Directly
```bash
# Test iTunes step
curl -X POST http://localhost:3000/api/trigger-pipeline \
  -H "Content-Type: application/json" \
  -d '{"step": "itunes", "query": "productivity"}'

# Test SERP step  
curl -X POST http://localhost:3000/api/trigger-pipeline \
  -H "Content-Type: application/json" \
  -d '{"step": "serp", "query": "social media"}'

# Test reconciliation
curl -X POST http://localhost:3000/api/trigger-pipeline \
  -H "Content-Type: application/json" \
  -d '{"step": "reconcile"}'
```

## 📁 Files Created

### ✅ Working Files:
- `src/app/trigger/page.tsx` - Simple trigger page
- `src/app/api/trigger-pipeline/route.ts` - API orchestrator
- `src/app/page.tsx` - Updated with trigger button

### 🔄 Backup Files:
- `src/app/trigger/page-complex.tsx` - Full-featured page (backup)
- `test_trigger_system.js` - Validation script

## 🎯 Expected Results

When working correctly:
1. **Home page**: Shows red "⚡ Trigger Pipeline" button
2. **Trigger page**: Simple interface with logs area
3. **API calls**: Return JSON with success/error status
4. **Database**: Gets updated with new app data

## 🔍 Troubleshooting

### If Navigation Fails:
- Check browser console for errors
- Verify `src/app/trigger/page.tsx` exists
- Try direct URL: `/trigger`

### If API Fails:
- Check `.env.local` has Supabase keys
- Verify database tables exist
- Check network tab for API responses

### If Database Fails:
- Run: `node test_trigger_system.js` 
- Verify Supabase connection
- Check service role key permissions

## 🚀 Next Steps

Once trigger page works:
1. Test full pipeline execution
2. Restore complex page with real-time monitoring
3. Deploy to production with Edge Functions

The trigger system is built and ready - just need to resolve the navigation issue!