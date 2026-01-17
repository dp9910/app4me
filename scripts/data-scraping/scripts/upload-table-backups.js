const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function uploadTableBackups(backupDir = 'data-scraping/table-backups') {
  console.log('🚀 Starting upload of table backups...');
  
  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup directory not found: ${backupDir}`);
    return;
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.error('❌ No JSON backup files found');
    return;
  }

  console.log(`Found ${files.length} backup files:`);
  files.forEach(f => console.log(`  - ${f}`));

  for (const file of files) {
    const tableName = file.split('_')[0] + '_' + file.split('_')[1]; // e.g., "apps_unified"
    const filePath = path.join(backupDir, file);
    
    console.log(`\n📤 Uploading ${tableName} from ${file}...`);
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`  Found ${data.length} records to upload`);
      
      // Upload in batches
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: tableName === 'apps_unified' ? 'id' : 'app_id' });
        
        if (error) {
          console.error(`  ❌ Error uploading batch ${Math.floor(i / batchSize) + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`  ✅ Uploaded batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(data.length / batchSize)}`);
          successCount++;
        }
      }
      
      console.log(`  Upload complete: ${successCount} successful, ${errorCount} failed batches`);
      
    } catch (err) {
      console.error(`  ❌ Error processing ${file}:`, err.message);
    }
  }
  
  console.log('\n🎉 Upload process complete!');
}

// Check if a specific backup directory was passed as argument
const backupDir = process.argv[2] || 'data-scraping/table-backups';
uploadTableBackups(backupDir);