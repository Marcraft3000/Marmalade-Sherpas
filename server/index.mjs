import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

import { getAllCasesOverview, getCaseDetails, getCaseBriefForLLM, importPlan, sampleReportPath } from './casesService.mjs';
import { analyzePlan } from './planInference.mjs';
import { aiService } from './aiService.mjs';
import { auditEngine } from './auditEngine.mjs';
import { advisorPortalEnabled, configureAdvisorPortal, portalErrorHandler } from './advisorPortal.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const PUBLIC_DEMO = process.env.PUBLIC_DEMO === 'true';
const PROXY_URL = (process.env.LLM_PROXY_URL || 'https://llm-hackathon.sherpaswealth.com').replace(/\/$/, '');
const TEAM_KEY = process.env.TEAM_KEY || '';
const REALTIME_MODELS = ['gpt-realtime-2.1-mini', 'gpt-realtime-2.1', 'gemini-3.8-live'];

const app = express();
if (PUBLIC_DEMO || advisorPortalEnabled) {
  app.use(['/api/plans', '/api/monitor/mock-mode'], (req, res) => {
    res.status(403).json({ success: false, error: 'This demo uses sample plans and built-in responses.' });
  });
} else {
  app.use(cors());
}
app.use(express.json({ limit: '5mb' }));
app.use((err, req, res, next) => {
  if (err) return res.status(err.status || 400).json({ success: false, error: err.type === 'entity.too.large' ? 'The JSON file must be smaller than 5 MB.' : 'Invalid JSON request.' });
  next();
});

// Persistent sessions folder
const SESSIONS_DIR = process.env.AUDIT_SESSIONS_DIR || path.resolve(here, '../data', PUBLIC_DEMO ? 'demo-sessions' : 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function persistSessionToFile(session) {
  try {
    const file = path.join(SESSIONS_DIR, `${session.id}.json`);
    fs.writeFileSync(file, JSON.stringify(session, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save session to disk:', err.message);
  }
}

function loadSessionsFromDisk() {
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
      if (data?.id && (!PUBLIC_DEMO || getCaseDetails(data.caseId))) {
        auditEngine.restoreSession(data);
      }
    }
  } catch (e) {
    console.warn('Could not load sessions from disk:', e.message);
  }
}

if (!advisorPortalEnabled) loadSessionsFromDisk();

configureAdvisorPortal(app);

app.use('/api/audit', (req, res, next) => {
  req.auditEngine ??= auditEngine;
  next();
});

function saveSession(req, session) {
  if (req.saveAuditSession) return req.saveAuditSession(session);
  persistSessionToFile(session);
}

function sessionError(res, error, fallbackStatus = 500) {
  res.status(error.status || fallbackStatus).json({ success: false, error: error.message });
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. Get all cases
app.get('/api/cases', (req, res) => {
  if (advisorPortalEnabled) return res.sendStatus(404);
  try {
    const cases = getAllCasesOverview();
    res.json({ success: true, cases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/plans/inspect', async (req, res) => {
  try { res.json({ success: true, inspection: await analyzePlan(req.body.document) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.post('/api/plans/import', (req, res) => {
  try { res.status(201).json({ success: true, case: importPlan(req.body.document, req.body.options) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// 2. Get single case details
app.get('/api/cases/:id', (req, res) => {
  if (advisorPortalEnabled) return res.sendStatus(404);
  try {
    const details = getCaseDetails(req.params.id);
    if (!details) return res.status(404).json({ success: false, error: 'Case not found' });
    res.json({ success: true, case: details });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/cases/:id/report', (req, res) => {
  if (advisorPortalEnabled) return res.sendStatus(404);
  const report = sampleReportPath(req.params.id);
  return report ? res.sendFile(report) : res.sendStatus(404);
});

// 3. Create or resume an audit session
app.post('/api/audit/session/new', (req, res) => {
  try {
    const { caseId, coupleMode } = req.body;
    const session = auditEngine.createSession(caseId, Boolean(coupleMode));
    persistSessionToFile(session);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/audit/session/:id', (req, res) => {
  const session = req.auditEngine.getSession(req.params.id);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, session });
});

// 4. Record interrogation answer
app.post('/api/audit/interrogate', async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    const result = await req.auditEngine.handleInterrogationAnswer(sessionId, answer);
    await saveSession(req, result.session);
    res.json(result);
  } catch (err) {
    sessionError(res, err);
  }
});

// 5. Interrogation summary ("Here's what I heard")
app.post('/api/audit/summary', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const engine = req.auditEngine;
    if (advisorPortalEnabled) {
      if (req.body.answer?.category !== 'future_expectation') {
        return res.status(400).json({ success: false, error: 'Complete the final question before submitting.' });
      }
      await engine.handleInterrogationAnswer(sessionId, req.body.answer);
    }
    const summary = await engine.generateInterrogationSummary(sessionId);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, summary });
  } catch (err) {
    sessionError(res, err);
  }
});

// 6. Generate the Reveal (Expected vs Actual, Gap, Discoveries)
app.post('/api/audit/reveal', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const reveal = await req.auditEngine.generateReveal(sessionId);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, reveal });
  } catch (err) {
    sessionError(res, err);
  }
});

app.post('/api/audit/route', async (req, res) => {
  try {
    const { sessionId, discoveryId } = req.body;
    const reveal = req.auditEngine.chooseRoute(sessionId, discoveryId);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, reveal });
  } catch (err) {
    sessionError(res, err, 400);
  }
});

// 7. Check user understanding on a discovery
app.post('/api/audit/discovery/check', async (req, res) => {
  try {
    const { sessionId, discoveryId, choice, userComment } = req.body;
    const result = await req.auditEngine.handleUnderstandingCheck(sessionId, discoveryId, choice, userComment);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json(result);
  } catch (err) {
    sessionError(res, err);
  }
});

app.post('/api/audit/discovery/explore', async (req, res) => {
  try {
    const { sessionId, discoveryId, question } = req.body;
    const exploration = await req.auditEngine.exploreDiscovery(sessionId, discoveryId, question);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, exploration });
  } catch (err) {
    sessionError(res, err, 400);
  }
});

// 8. Generate Verdict
app.post('/api/audit/verdict', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const verdict = await req.auditEngine.generateVerdict(sessionId);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, verdict });
  } catch (err) {
    sessionError(res, err);
  }
});

// 9. Generate Mission
app.post('/api/audit/mission', async (req, res) => {
  try {
    const { sessionId, recommendationId } = req.body;
    const mission = await req.auditEngine.generateMission(sessionId, recommendationId);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, mission });
  } catch (err) {
    sessionError(res, err);
  }
});

// 10. Accept / reject mission
app.post('/api/audit/mission/accept', async (req, res) => {
  try {
    const { sessionId, decision, reason } = req.body;
    const result = await req.auditEngine.handleMissionAcceptance(sessionId, decision, reason);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json(result);
  } catch (err) {
    sessionError(res, err);
  }
});

// 11. Follow-up & Time Travel (Day 3 & Day 30)
app.post('/api/audit/followup', async (req, res) => {
  try {
    const { sessionId, day, status, details } = req.body;
    const result = await req.auditEngine.handleFollowUp(sessionId, { day, status, details });
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, followUp: result });
  } catch (err) {
    sessionError(res, err);
  }
});

// 12. Advisor Briefing
app.post('/api/audit/briefing', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const briefing = await req.auditEngine.generateAdvisorBriefing(sessionId);
    await saveSession(req, req.auditEngine.getSession(sessionId));
    res.json({ success: true, briefing });
  } catch (err) {
    sessionError(res, err);
  }
});

// 13. Monitor usage & token tracking dev console
app.get('/api/monitor/usage', (req, res) => {
  if (PUBLIC_DEMO || advisorPortalEnabled) return res.json({ success: true, mockMode: aiService.mockMode, publicDemo: PUBLIC_DEMO });
  res.json({
    success: true,
    mockMode: aiService.mockMode,
    usage: aiService.getUsageSummary()
  });
});

app.post('/api/monitor/mock-mode', (req, res) => {
  const { enabled } = req.body;
  aiService.setMockMode(Boolean(enabled));
  res.json({ success: true, mockMode: aiService.mockMode });
});

app.use(portalErrorHandler);
app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'API route not found.' }));

// Serve frontend in production
const distDir = path.resolve(here, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// ==========================================
// HTTP + WEBSOCKET SERVER
// ==========================================
const server = http.createServer(app);

// WebSocket relay for real-time voice
if (!PUBLIC_DEMO && !advisorPortalEnabled) {
  const wss = new WebSocketServer({ server, path: '/voice' });
  wss.on('connection', relayVoice);
}

function relayVoice(browserWs, req) {
  const url = new URL(req.url, 'http://localhost');
  const model = url.searchParams.get('model') || 'gpt-realtime-2.1-mini';
  const caseId = url.searchParams.get('case');

  if (!REALTIME_MODELS.includes(model)) {
    return browserWs.close(1008, 'Unknown model');
  }

  const caseBrief = caseId ? getCaseBriefForLLM(caseId) : '';
  const upstreamUrl = `${PROXY_URL.replace(/^http/, 'ws')}/v1/realtime?model=${model}`;

  let upstreamWs = null;
  try {
    upstreamWs = new WebSocket(upstreamUrl, {
      headers: { Authorization: `Bearer ${TEAM_KEY}` },
    });
  } catch (err) {
    console.error('Failed to open upstream voice WebSocket:', err.message);
    return browserWs.close(1011, 'Upstream connection error');
  }

  upstreamWs.on('open', () => {
    console.log(`[Voice] Upstream WebSocket connected for case: ${caseId || 'none'}`);
  });

  upstreamWs.on('message', (data, isBinary) => {
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(data, { binary: isBinary });
    }
  });

  browserWs.on('message', (data, isBinary) => {
    if (upstreamWs.readyState !== WebSocket.OPEN) return;

    if (!isBinary) {
      try {
        const msg = JSON.parse(data.toString());
        // Augment session.update with case instructions
        if (msg.type === 'session.update' && caseBrief) {
          const customPrompt = `You are Caleb Hammer, the lead auditor on THE PLAN AUDIT.
Help this family understand their situation. Use ONLY these official Sherpas numbers. Be direct, sarcastic but caring, and concise.

${caseBrief}`;
          msg.session = {
            ...msg.session,
            instructions: `${msg.session?.instructions || ''}\n\n${customPrompt}`,
          };
          upstreamWs.send(JSON.stringify(msg));
          return;
        }
      } catch {
        // pass through non-json
      }
    }
    upstreamWs.send(data, { binary: isBinary });
  });

  const cleanup = () => {
    if (upstreamWs && upstreamWs.readyState === WebSocket.OPEN) upstreamWs.close();
    if (browserWs && browserWs.readyState === WebSocket.OPEN) browserWs.close();
  };

  browserWs.on('close', cleanup);
  browserWs.on('error', cleanup);
  upstreamWs.on('close', cleanup);
  upstreamWs.on('error', cleanup);
}

server.listen(PORT, () => {
  console.log(`⚡ THE PLAN AUDIT Server running on http://localhost:${PORT}`);
});
