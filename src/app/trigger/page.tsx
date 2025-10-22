'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TriggerPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const triggerPipeline = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setLogs([]);
    addLog('🚀 Starting full pipeline execution...');

    try {
      // Step 1: iTunes API
      addLog('📱 Step 1/4: Fetching iTunes data...');
      const itunesResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'itunes', query: 'productivity' })
      });
      
      const itunesData = await itunesResponse.json();
      if (itunesData.success) {
        addLog(`✅ iTunes: Fetched ${itunesData.count} apps`);
      } else {
        addLog(`❌ iTunes: ${itunesData.error}`);
      }

      // Step 2: Apple RSS
      addLog('🍎 Step 2/4: Fetching Apple RSS data...');
      const rssResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'rss' })
      });
      
      const rssData = await rssResponse.json();
      if (rssData.success) {
        addLog(`✅ Apple RSS: ${rssData.message || 'Processed successfully'}`);
      } else {
        addLog(`⚠️ Apple RSS: ${rssData.error || 'Not implemented yet'}`);
      }

      // Step 3: SERP API
      addLog('🔍 Step 3/4: Fetching SERP API data...');
      const serpResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'serp', query: 'social media' })
      });
      
      const serpData = await serpResponse.json();
      if (serpData.success) {
        addLog(`✅ SERP API: Fetched ${serpData.count} apps`);
      } else {
        addLog(`❌ SERP API: ${serpData.error}`);
      }

      // Step 4: Data Reconciliation
      addLog('🔄 Step 4/4: Running data reconciliation...');
      const reconcileResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'reconcile' })
      });
      
      const reconcileData = await reconcileResponse.json();
      if (reconcileData.success) {
        addLog(`✅ Reconciliation: ${reconcileData.reconciledCount} apps unified`);
        addLog(`📊 Quality Score: ${reconcileData.avgQuality}/100`);
        addLog(`🔄 Multi-source apps: ${reconcileData.multiSourceCount}`);
      } else {
        addLog(`❌ Reconciliation: ${reconcileData.error}`);
      }
      
      addLog('🎉 Full pipeline execution complete!');
      addLog('📈 Check your database - unified apps should be updated');
      
    } catch (error) {
      addLog(`💥 Pipeline Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            Full Pipeline Trigger
          </h1>
          <p className="text-gray-600 mt-2">
            Execute complete data pipeline: iTunes → Apple RSS → SERP API → Data Reconciliation
          </p>
        </div>
        
        <button
          onClick={triggerPipeline}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-bold text-white ${
            isRunning 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isRunning ? '⚡ Running Full Pipeline...' : '⚡ Trigger Full Pipeline (4 Steps)'}
        </button>
      </div>

      {/* Logs */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-xl font-bold mb-4">Execution Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                No logs yet. Click "Trigger Pipeline" to start.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}