const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const manualAppSearchScript = path.join(__dirname, 'search_pd.js');
const uploadProcessedDataScript = path.join(__dirname, 'upload-processed-data.js');
const topicsFilePath = path.join(__dirname, 'topics.txt');
const finishedTopicsFilePath = path.join(__dirname, 'finished_topics.txt');

function readTopics(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').map(line => line.trim().toLowerCase()).filter(line => line.length > 0);
}

function appendToFinishedTopics(topic) {
  fs.appendFileSync(finishedTopicsFilePath, `${topic}\n`, 'utf-8');
}

async function runProcessAndUploadLoop() {
  console.log('🚀 Starting processing and upload loop...');

  const allTopics = readTopics(topicsFilePath);
  const finishedTopics = new Set(readTopics(finishedTopicsFilePath));

  const unprocessedTopics = allTopics.filter(topic => !finishedTopics.has(topic));

  if (unprocessedTopics.length === 0) {
    console.log('✅ No new topics to process. All topics in topics.txt are already in finished_topics.txt.');
    return;
  }

  console.log(`Found ${unprocessedTopics.length} unprocessed topics out of ${allTopics.length} total topics.`);
  console.log(`Unprocessed topics: ${unprocessedTopics.join(', ')}\n`);

  for (const topic of unprocessedTopics) {
    console.log(`🚀 === Processing topic: "${topic}" ===`);
    try {
      console.log(`  Running manual-app-search.js for "${topic}"...`);
      execSync(`node "${manualAppSearchScript}" "${topic}"`, { stdio: 'inherit' });
      console.log(`  ✅ manual-app-search.js completed for "${topic}".`);

      console.log(`  Running upload-processed-data.js...`);
      execSync(`node "${uploadProcessedDataScript}"`, { stdio: 'inherit' });
      console.log(`  ✅ upload-processed-data.js completed.`);
      
      appendToFinishedTopics(topic);
      console.log(`  ✅ Topic "${topic}" moved to finished_topics.txt.`);
      
      console.log(`
=== Finished processing and uploading for "${topic}" ===
`);

    } catch (error) {
      console.error(`❌ Error processing topic "${topic}":`, error.message);
      console.error(`  Skipping to next topic...`);
    }
  }

  console.log('🎉 All available topics processed and uploaded (or skipped due to errors). Loop finished.');
}

// Main execution
if (require.main === module) {
  runProcessAndUploadLoop();
}