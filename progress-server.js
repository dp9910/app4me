// progress-server.js - Real-time progress tracking server

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { MasterPipeline, ProgressTracker } = require('./scripts/master-pipeline.js');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for active sessions
const activeSessions = new Map();

// Start search endpoint
app.post('/api/search', async (req, res) => {
  const { query, options = {} } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const pipeline = new MasterPipeline();
    
    // Store session info
    activeSessions.set(sessionId, {
      query,
      startTime: Date.now(),
      status: 'running',
      currentStep: 0
    });
    
    // Start pipeline in background
    pipeline.runPipeline(query, {
      limit: options.limit || 15,
      saveIntermediateFiles: false,
      showDetailedLogs: false,
      sessionId: sessionId,
      progressCallback: (update) => {
        // Update session status
        if (activeSessions.has(sessionId)) {
          const session = activeSessions.get(sessionId);
          session.currentStep = update.currentStep;
          session.lastUpdate = update;
          
          if (update.type === 'completed') {
            session.status = 'completed';
            session.results = update.results;
          } else if (update.type === 'error') {
            session.status = 'error';
            session.error = update.error;
          }
        }
      }
    }).then(results => {
      // Final update
      if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        session.status = 'completed';
        session.results = results.final_results;
        session.duration = Date.now() - session.startTime;
      }
    }).catch(error => {
      // Error handling
      if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        session.status = 'error';
        session.error = error.message;
      }
    });
    
    res.json({
      sessionId,
      message: 'Search started',
      status: 'running'
    });
    
  } catch (error) {
    console.error('Failed to start search:', error);
    res.status(500).json({ error: 'Failed to start search' });
  }
});

// Get session progress endpoint
app.get('/api/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Try to get from active sessions first
  if (activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    return res.json(session);
  }
  
  // Fallback to file-based progress
  try {
    const progressFile = `./temp-progress-${sessionId}.json`;
    if (fs.existsSync(progressFile)) {
      const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      return res.json(progress);
    }
  } catch (error) {
    console.error('Failed to read progress file:', error);
  }
  
  res.status(404).json({ error: 'Session not found' });
});

// Get all active sessions
app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
    sessionId: id,
    query: data.query,
    status: data.status,
    currentStep: data.currentStep,
    startTime: data.startTime,
    duration: data.duration || (Date.now() - data.startTime)
  }));
  
  res.json({ sessions });
});

// Serve the enhanced UI
app.get('/ai-trace/:sessionId?', (req, res) => {
  const { sessionId } = req.params;
  
  // Read the base HTML template
  const htmlPath = path.join(__dirname, 'init_documents/new_ui/llm_backend_log_display/code.html');
  
  if (!fs.existsSync(htmlPath)) {
    return res.status(404).send('AI Trace UI not found');
  }
  
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Inject session ID and API configuration
  const scriptInjection = `
    <script>
      window.AI_TRACE_CONFIG = {
        sessionId: ${sessionId ? `"${sessionId}"` : 'null'},
        apiBaseUrl: window.location.origin + '/api',
        pollInterval: 1000
      };
    </script>
  `;
  
  html = html.replace('</head>', `${scriptInjection}</head>`);
  
  res.send(html);
});

// Cleanup old sessions (run every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - (30 * 60 * 1000); // 30 minutes
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.startTime < cutoff && session.status !== 'running') {
      activeSessions.delete(sessionId);
      
      // Also clean up progress files
      try {
        const progressFile = `./temp-progress-${sessionId}.json`;
        if (fs.existsSync(progressFile)) {
          fs.unlinkSync(progressFile);
        }
      } catch (error) {
        console.error('Failed to cleanup progress file:', error);
      }
    }
  }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Progress tracking server running on http://localhost:${PORT}`);
  console.log(`📊 AI Trace UI available at http://localhost:${PORT}/ai-trace`);
  console.log(`🔍 Start search: POST ${PORT}/api/search`);
  console.log(`📡 Get progress: GET ${PORT}/api/progress/:sessionId`);
});