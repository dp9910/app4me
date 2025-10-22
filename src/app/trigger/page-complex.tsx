'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface PipelineStatus {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  totalSteps: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export default function TriggerPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<PipelineStatus>({
    isRunning: false,
    currentStep: 'Ready',
    progress: 0,
    totalSteps: 6
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    setLogs(prev => [...prev, newLog]);
  };

  const updateStatus = (updates: Partial<PipelineStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  };

  const clearLogs = () => {
    setLogs([]);
    setStatus({
      isRunning: false,
      currentStep: 'Ready',
      progress: 0,
      totalSteps: 6
    });
  };

  const triggerPipeline = async () => {
    if (status.isRunning) return;

    clearLogs();
    updateStatus({ 
      isRunning: true, 
      startTime: new Date().toISOString(),
      currentStep: 'Initializing...',
      progress: 0,
      error: undefined
    });

    addLog('info', '🚀 Starting data pipeline execution...');

    try {
      // Step 1: Initialize
      updateStatus({ currentStep: 'Initializing Pipeline', progress: 1 });
      addLog('info', '⚙️ Initializing pipeline components...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Fetch iTunes Data
      updateStatus({ currentStep: 'Fetching iTunes Data', progress: 2 });
      addLog('info', '🍎 Fetching iTunes Search API data...');
      
      const itunesResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'itunes', query: 'productivity' })
      });
      
      const itunesData = await itunesResponse.json();
      if (itunesData.success) {
        addLog('success', `✅ iTunes: Fetched ${itunesData.count} apps`);
      } else {
        addLog('error', `❌ iTunes: ${itunesData.error}`);
        throw new Error(itunesData.error);
      }

      // Step 3: Fetch Apple RSS Data
      updateStatus({ currentStep: 'Fetching Apple RSS Data', progress: 3 });
      addLog('info', '🍎 Fetching Apple RSS feed data...');
      
      const rssResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'rss' })
      });
      
      const rssData = await rssResponse.json();
      if (rssData.success) {
        addLog('success', `✅ Apple RSS: Fetched ${rssData.count} apps`);
      } else {
        addLog('warning', `⚠️ Apple RSS: ${rssData.error || 'No new data'}`);
      }

      // Step 4: Fetch SERP Data
      updateStatus({ currentStep: 'Fetching SERP API Data', progress: 4 });
      addLog('info', '🔍 Fetching SERP API data...');
      
      const serpResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'serp', query: 'social media' })
      });
      
      const serpData = await serpResponse.json();
      if (serpData.success) {
        addLog('success', `✅ SERP API: Fetched ${serpData.count} apps`);
      } else {
        addLog('error', `❌ SERP API: ${serpData.error}`);
        throw new Error(serpData.error);
      }

      // Step 5: Data Reconciliation
      updateStatus({ currentStep: 'Running Data Reconciliation', progress: 5 });
      addLog('info', '🔄 Running data reconciliation and duplicate detection...');
      
      const reconcileResponse = await fetch('/api/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'reconcile' })
      });
      
      const reconcileData = await reconcileResponse.json();
      if (reconcileData.success) {
        addLog('success', `✅ Reconciliation: ${reconcileData.reconciledCount} apps unified`);
        addLog('info', `📊 Quality Score: ${reconcileData.avgQuality}/100`);
        addLog('info', `🔄 Multi-source apps: ${reconcileData.multiSourceCount}`);
      } else {
        addLog('error', `❌ Reconciliation: ${reconcileData.error}`);
        throw new Error(reconcileData.error);
      }

      // Step 6: Complete
      updateStatus({ 
        currentStep: 'Pipeline Complete', 
        progress: 6,
        isRunning: false,
        endTime: new Date().toISOString()
      });
      
      addLog('success', '🎉 Data pipeline executed successfully!');
      addLog('info', `⏱️ Total execution time: ${((new Date().getTime() - new Date(status.startTime!).getTime()) / 1000).toFixed(1)}s`);

    } catch (error) {
      updateStatus({ 
        isRunning: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date().toISOString()
      });
      addLog('error', `💥 Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-700 dark:text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-primary/20 dark:border-primary/30 px-10 py-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/')}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Pipeline Trigger
          </h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={clearLogs}
            disabled={status.isRunning}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear Logs
          </button>
          <button
            onClick={triggerPipeline}
            disabled={status.isRunning}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status.isRunning ? '⚡ Running...' : '⚡ Trigger Pipeline'}
          </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Status Panel */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-primary/20 dark:border-primary/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pipeline Status</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              status.isRunning 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                : status.error
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            }`}>
              {status.isRunning ? 'Running' : status.error ? 'Failed' : 'Ready'}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {status.currentStep}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {status.progress}/{status.totalSteps}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(status.progress / status.totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {(status.startTime || status.endTime) && (
              <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                {status.startTime && (
                  <div>Started: {formatTimestamp(status.startTime)}</div>
                )}
                {status.endTime && (
                  <div>Ended: {formatTimestamp(status.endTime)}</div>
                )}
              </div>
            )}

            {status.error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="text-red-800 dark:text-red-300 font-medium">Error:</div>
                <div className="text-red-700 dark:text-red-400">{status.error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Logs Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-primary/20 dark:border-primary/30">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Execution Logs</h2>
          </div>
          
          <div className="h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                No logs yet. Click "Trigger Pipeline" to start.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={getLogColor(log.level)}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Steps Info */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-primary/20 dark:border-primary/30 p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Pipeline Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Data Collection</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Fetch iTunes Search API</li>
                <li>• Fetch Apple RSS feeds</li>
                <li>• Fetch SERP API data</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Data Processing</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Parse and validate data</li>
                <li>• Check for duplicates</li>
                <li>• Store in source tables</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Reconciliation</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Merge multi-source data</li>
                <li>• Calculate quality scores</li>
                <li>• Update unified table</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}