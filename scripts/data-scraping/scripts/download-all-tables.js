const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function downloadAllTables() {
  console.log('🚀 Starting download of all tables...');
  
  const outputDir = 'data-scraping/table-backups';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const tables = [
    { name: 'apps_unified', filename: `apps_unified_${timestamp}.json` },
    { name: 'app_embeddings', filename: `app_embeddings_${timestamp}.json` },
    { name: 'app_features', filename: `app_features_${timestamp}.json` }
  ];

  for (const table of tables) {
    console.log(`\n📥 Downloading ${table.name}...`);
    
    try {
      let allData = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from(table.name)
          .select('*')
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allData = allData.concat(data);
        from += batchSize;
        
        console.log(`  Fetched ${allData.length} records so far...`);
        
        if (data.length < batchSize) break;
      }
      
      const filePath = path.join(outputDir, table.filename);
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
      
      console.log(`  ✅ Saved ${allData.length} records to ${filePath}`);
      
    } catch (err) {
      console.error(`  ❌ Error downloading ${table.name}:`, err.message);
    }
  }
  
  console.log('\n🎉 Download complete!');
  console.log(`Files saved in: ${outputDir}`);
}

downloadAllTables();