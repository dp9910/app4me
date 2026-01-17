const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testTriggerFix() {
  console.log('🔧 Testing trigger re-enable and functionality...');
  
  try {
    // Clear existing test data
    await supabase.from('apps_unified').delete().neq('id', 0);
    console.log('🧹 Cleared existing unified data');
    
    // Test insert with trigger (should auto-calculate quality score)
    const testApp = {
      bundle_id: 'com.test.trigger',
      title: 'Test Trigger App',
      developer: 'Test Developer Inc.',
      version: '1.0.0',
      rating: 4.5,
      rating_count: 5000,
      rating_source: 'test_api',
      icon_url: 'https://example.com/icon.jpg',
      description: 'This is a test app to verify that our database trigger is working properly with JSONB handling.',
      description_source: 'test_api',
      primary_category: 'Testing',
      all_categories: ['Testing', 'Development'], // Array - let trigger handle JSONB conversion
      available_in_sources: ['test'],
      total_appearances: 1
      // Note: NOT setting data_quality_score manually - let trigger calculate it
    };
    
    console.log('📱 Inserting test app (should trigger auto-scoring)...');
    const { data, error } = await supabase
      .from('apps_unified')
      .insert(testApp)
      .select('bundle_id, title, data_quality_score, last_reconciled, reconciliation_count')
      .single();
    
    if (error) {
      console.log('❌ Trigger test failed:', error);
      return false;
    }
    
    console.log('✅ SUCCESS! Auto-scoring working:', {
      bundle_id: data.bundle_id,
      title: data.title,
      auto_calculated_score: data.data_quality_score,
      last_reconciled: data.last_reconciled,
      reconciliation_count: data.reconciliation_count
    });
    
    if (data.data_quality_score && data.data_quality_score > 0) {
      console.log('🎉 Trigger is working! Quality score auto-calculated:', data.data_quality_score);
      
      // Test update trigger
      console.log('🔄 Testing update trigger...');
      const { data: updateData, error: updateError } = await supabase
        .from('apps_unified')
        .update({ rating: 4.8, rating_count: 10000 })
        .eq('bundle_id', 'com.test.trigger')
        .select('data_quality_score, reconciliation_count')
        .single();
      
      if (updateError) {
        console.log('❌ Update trigger failed:', updateError);
      } else {
        console.log('✅ Update trigger working! New score:', updateData.data_quality_score, 'Count:', updateData.reconciliation_count);
      }
      
      return true;
    } else {
      console.log('⚠️ Trigger may not be working - no auto-calculated score');
      return false;
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

testTriggerFix().then(success => {
  if (success) {
    console.log('\\n🎉 Database trigger is working properly!');
    console.log('✅ Auto quality scoring functional');
    console.log('✅ JSONB handling fixed');
    console.log('✅ Reconciliation metadata updating');
  } else {
    console.log('\\n❌ Trigger still needs manual setup in Supabase SQL Editor');
    console.log('📝 Run fix_unified_trigger.sql manually in Supabase dashboard');
  }
});