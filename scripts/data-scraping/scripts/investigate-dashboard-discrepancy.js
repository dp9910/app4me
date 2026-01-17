const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Try with both keys
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function investigateDashboardDiscrepancy() {
  console.log('🔍 Investigating dashboard vs API discrepancy...\n');
  console.log('Dashboard shows: 11,571 rows');
  console.log('API shows: 8,990 rows');
  console.log('Missing: 2,581 rows\n');
  
  try {
    // Test with anon key
    console.log('📋 Testing with ANON key...');
    const { count: anonCount, error: anonError } = await supabaseAnon
      .from('app_features')
      .select('*', { count: 'exact', head: true });
    
    console.log('Anon key count:', anonCount);
    if (anonError) console.log('Anon error:', anonError.message);
    
    // Test with service key (what we've been using)
    console.log('\n🔧 Testing with SERVICE key...');
    const { count: serviceCount, error: serviceError } = await supabaseService
      .from('app_features')
      .select('*', { count: 'exact', head: true });
    
    console.log('Service key count:', serviceCount);
    if (serviceError) console.log('Service error:', serviceError.message);
    
    // Try to get all records manually
    console.log('\n🔄 Manual pagination to find all records...');
    
    let totalFound = 0;
    let start = 0;
    const batchSize = 1000;
    let iterations = 0;
    
    while (iterations < 20) { // Safety limit
      const { data, error } = await supabaseService
        .from('app_features')
        .select('id, created_at, updated_at')
        .range(start, start + batchSize - 1)
        .order('created_at', { ascending: true });

      if (error) {
        console.log('Error at batch', start, ':', error.message);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      totalFound += data.length;
      start += batchSize;
      iterations++;
      
      console.log(`  Batch ${iterations}: ${data.length} records, total: ${totalFound}`);
      
      // Show date range for this batch
      if (data.length > 0) {
        const firstDate = data[0].created_at?.substring(0, 10);
        const lastDate = data[data.length - 1].created_at?.substring(0, 10);
        console.log(`    Date range: ${firstDate} to ${lastDate}`);
      }
      
      if (data.length < batchSize) break;
    }
    
    console.log('\n📊 RESULTS:');
    console.log('Total found via API:', totalFound);
    console.log('Dashboard shows:', 11571);
    console.log('Missing records:', 11571 - totalFound);
    
    // Try different ordering to see if we can find more records
    console.log('\n🔄 Trying different ordering (by ID desc)...');
    
    const { data: recentData, error: recentError } = await supabaseService
      .from('app_features')
      .select('id, app_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.log('Recent data error:', recentError);
    } else {
      console.log('Most recent records:');
      recentData.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}, App: ${record.app_id}, Date: ${record.created_at?.substring(0, 16)}`);
      });
    }
    
    // Check for any potential RLS or filtering
    console.log('\n🔒 Checking for potential filtering...');
    
    // Try to find the pattern in what we can access
    const { data: sampleData } = await supabaseService
      .from('app_features')
      .select('*')
      .limit(5);
    
    if (sampleData && sampleData.length > 0) {
      const sample = sampleData[0];
      console.log('Sample record columns:', Object.keys(sample));
      
      // Check if there are any null/filtering conditions
      const hasNulls = Object.entries(sample).filter(([key, value]) => value === null);
      if (hasNulls.length > 0) {
        console.log('Null fields in sample:', hasNulls.map(([key]) => key));
      }
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// If this script is run directly
if (require.main === module) {
  investigateDashboardDiscrepancy().catch(console.error);
}

module.exports = { investigateDashboardDiscrepancy };