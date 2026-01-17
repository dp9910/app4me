/**
 * Monitor Embedding Generation Progress
 * Run this to check the current status without interrupting the main process
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function monitorProgress() {
  console.log('📊 === EMBEDDING GENERATION MONITOR ===\n');
  
  try {
    // Check database progress
    const { count: totalApps } = await supabase
      .from('apps_unified')
      .select('id', { count: 'exact' });
      
    const { count: completedEmbeddings } = await supabase
      .from('new_embeddings')
      .select('id', { count: 'exact' });
      
    const remaining = totalApps - completedEmbeddings;
    const progressPercent = ((completedEmbeddings / totalApps) * 100).toFixed(1);
    
    console.log('📈 Database Progress:');
    console.log(`   Total apps: ${totalApps}`);
    console.log(`   Completed: ${completedEmbeddings}`);
    console.log(`   Remaining: ${remaining}`);
    console.log(`   Progress: ${progressPercent}%`);
    
    // Check backup files
    console.log('\n💾 Backup Files:');
    const backupFolder = 'new_embeddings';
    if (fs.existsSync(backupFolder)) {
      const files = fs.readdirSync(backupFolder)
        .filter(f => f.startsWith('embeddings-batch-'))
        .sort();
        
      console.log(`   Backup files: ${files.length}`);
      if (files.length > 0) {
        const latestFile = files[files.length - 1];
        const stats = fs.statSync(path.join(backupFolder, latestFile));
        console.log(`   Latest backup: ${latestFile}`);
        console.log(`   Last modified: ${stats.mtime.toISOString()}`);
        
        // Read latest backup to get detailed progress
        try {
          const backupData = JSON.parse(fs.readFileSync(path.join(backupFolder, latestFile), 'utf8'));
          console.log(`   Batch processed: ${backupData.total_processed}`);
          console.log(`   Success rate: ${((backupData.successful / backupData.total_processed) * 100).toFixed(1)}%`);
        } catch (err) {
          console.log('   (Could not read backup details)');
        }
      }
    } else {
      console.log('   No backup folder found');
    }
    
    // Check log files
    console.log('\n📋 Log Files:');
    const logFiles = fs.readdirSync('.')
      .filter(f => f.startsWith('embedding-generation-') && f.endsWith('.log'))
      .sort();
      
    if (logFiles.length > 0) {
      const latestLog = logFiles[logFiles.length - 1];
      const logStats = fs.statSync(latestLog);
      console.log(`   Latest log: ${latestLog}`);
      console.log(`   Last modified: ${logStats.mtime.toISOString()}`);
      
      // Show last few lines of log
      try {
        const logContent = fs.readFileSync(latestLog, 'utf8');
        const lines = logContent.split('\n').filter(l => l.trim());
        const lastLines = lines.slice(-3);
        console.log('   Recent log entries:');
        lastLines.forEach(line => {
          console.log(`     ${line}`);
        });
      } catch (err) {
        console.log('   (Could not read log file)');
      }
    } else {
      console.log('   No log files found');
    }
    
    // Estimated completion time
    if (completedEmbeddings > 0 && remaining > 0) {
      // Try to estimate based on recent backup timing
      const backupFolder = 'new_embeddings';
      if (fs.existsSync(backupFolder)) {
        const files = fs.readdirSync(backupFolder)
          .filter(f => f.startsWith('embeddings-batch-'))
          .map(f => ({
            name: f,
            time: fs.statSync(path.join(backupFolder, f)).mtime
          }))
          .sort((a, b) => a.time - b.time);
          
        if (files.length >= 2) {
          const timeDiff = files[files.length - 1].time - files[files.length - 2].time;
          const timePerBatch = timeDiff; // milliseconds per 100 apps
          const timePerApp = timePerBatch / 100;
          const remainingTime = remaining * timePerApp;
          
          const hours = Math.floor(remainingTime / (1000 * 60 * 60));
          const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
          
          console.log(`\n⏰ Estimated completion: ${hours}h ${minutes}m`);
        }
      }
    }
    
    if (remaining === 0) {
      console.log('\n🎉 EMBEDDING GENERATION COMPLETE!');
    } else if (progressPercent > 0) {
      console.log(`\n⚙️ Generation in progress... ${progressPercent}% complete`);
    } else {
      console.log('\n❓ Generation may not have started yet');
    }
    
  } catch (error) {
    console.error('❌ Error monitoring progress:', error.message);
  }
}

// Run every 30 seconds if called with --watch
if (process.argv.includes('--watch')) {
  console.log('👀 Watching progress every 30 seconds (Ctrl+C to stop)...\n');
  
  const runMonitor = async () => {
    await monitorProgress();
    console.log('\n' + '='.repeat(60) + '\n');
  };
  
  runMonitor();
  setInterval(runMonitor, 30000);
} else {
  monitorProgress();
}